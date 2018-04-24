const coap = require('./coap');
const WS = require('ws');
const debug = require('debug')('coap-proxy');

class CoapProxy {
    constructor(target, maxConnections) {
        if (!target) {
            throw new TypeError('target are mandatory properties of string type');
        }

        this._target = target;
        this._server = coap.createServer({ piggybackReplyMs: 1 });
        this._sockets = new Map();
        this._maxWSConnections = maxConnections;

        this._proxyCoapRequests();
    }

    listen(port, address = 'localhost') {
        return new Promise((resolve, reject) => {
            this._server.listen(port, address, () => {
                resolve();
            });
        });
    }

    hasReachedMaxWSConnections() {
        return this._sockets.size >= this.maxWSConnections();
    }

    maxWSConnections(count) {
        if (typeof count === 'undefined') {
            return this._maxWSConnections;
        } else {
            const c = +count;

            if (c <= 0 || isNaN(c)) {
                throw new TypeError('max WS connections count must be number more than 0');
            }
            this._maxWSConnections = c;
        }
    }

    _proxyCoapRequests() {
        this._server.on('request', (req, res) => {
            if (typeof req.headers.Observe !== 'undefined') {
                debug('Observe request');

                if (this.hasReachedMaxWSConnections()) {
                    debug('Proxy has reached maximum WS connections! Rejecting request...');
                    res.end(JSON.stringify({ error: 'proxy has reached maximum WS connections' }));
                    return;
                }

                this._handleObserveRequest(req, res);
            } else {
                debug('Not Observe request, rejecting...');
                res.end(JSON.stringify({ error: 'Only Observe requests are supported' }));
            }
        });
    }

    _handleObserveRequest(coapReq, coapConnection) {
        const id = this._getSocketIdOption(coapReq.options);
        const socket = id && id.value && this._sockets.get(id.value.toString());

        if (socket) {
            this._proxyMessage(coapReq, socket).then(stringMsg => {
                debug(`id: ${id.value} — CoAP message ${stringMsg}`);
            });
        } else {
            this._establishWebsocket(coapConnection);
        }
    }

    _getSocketIdOption(options = []) {
        return options.filter(opt => opt.name === CoapProxy.SOCKET_ID_OPTION)[0];
    }

    _proxyMessage(coapReq, socket) {
        return this._readAllCoapRequestData(coapReq).then(msg => {
            const stringMsg = msg.toString();
            socket.send(stringMsg);

            return stringMsg;
        });
    }

    _readAllCoapRequestData(coapReq) {
        const chunks = [];
        return new Promise((resolve, reject) => {
            coapReq.on('data', chunk => {
                chunks.push(chunk);
            }).on('end', () => {
                resolve(Buffer.concat(chunks));
            }).on('error', reject);
        });
    }

    _piggybackedResponse(coapConnection) {
        coapConnection.write(JSON.stringify({
            status: 0
        }));
    }

    _establishWebsocket(coapConnection) {
        const id = this._generateId();
        const socket = this._createSocket(id);

        socket.on('open', () => {
            debug(`id: ${id} — WebSocket has been opened`);
            coapConnection.write(JSON.stringify({ id }));
        }).on('close', () => {
            debug(`id: ${id} — WebSocket has been closed`);
            this._resetCoapConnection(coapConnection, id);
        }).on('message', msg => {
            debug(`id: ${id} — WebSocket message ${JSON.stringify(msg)}`);
            coapConnection.write(msg);
        }).on('error', error => {
            debug(`id: ${id} — WebSocket error: ${JSON.stringify(error)}`);
            coapConnection.write(JSON.stringify({ error: 'Websocket error' }));
            this._resetCoapConnection(coapConnection, id);
        });

        coapConnection.on('finish', () => {
            debug(`id: ${id} — CoAP connection has been closed`);
            socket.close();
            this._deleteSocket(id);
        });

        return id;
    }

    _generateId() {
        return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString();
    }

    _createSocket(id) {
        const socket = new WS(this._target);
        this._sockets.set(id, socket);

        return socket;
    }

    _resetCoapConnection(conn, socketToRemove) {
        conn._packet.options = []; // THIS IS WORKAROUND TO AVOID EXCEPTION, PROPER SOLUTION IS REQUIRED
        conn.reset();

        if (socketToRemove) {
            this._deleteSocket(socketToRemove);
        }
    }

    _deleteSocket(id) {
        this._sockets.delete(id);
    }

    static get SOCKET_ID_OPTION() { return '111'; }
}

module.exports = CoapProxy;