const coap = require('coap');
const WS = require('ws');

class CoapProxy {
    constructor(target) {
        if (!target) {
            throw new TypeError('target are mandatory properties of string type');
        }

        this._target = target;
        this._server = coap.createServer();
        this._sockets = new Map();

        this._proxyCoapRequests();
    }

    listen(port, address = 'localhost') {
        return new Promise((resolve, reject) => {
            this._server.listen(port, address, () => {
                resolve();
            });
        });
    }

    _proxyCoapRequests() {
        this._server.on('request', (req, res) => {
            if (typeof req.headers.Observe !== 'undefined') {
                this._piggybackedResponse(res);
                this._handleObserveRequest(req, res);
            } else {
                res.end(JSON.stringify({ error: 'Only Observe requests are supported' }));
            }
        });
    }

    _piggybackedResponse(res) {
        res.write('{}');
    }

    _handleObserveRequest(coapReq, coapConnection) {
        const id = this._getSocketIdOption(coapReq.options);
        const socket = id && id.value && this._sockets.get(id.value.toString());

        if (socket) {   
            this._proxyMessage(coapReq, socket);
        } else {            
            this._establishWebsocket(coapConnection);
        }
    }

    _getSocketIdOption(options = []) {
        return options.filter(opt => opt.name === CoapProxy.SOCKET_ID_OPTION)[0];
    }

    _proxyMessage(coapReq, socket) {
        this._readAllCoapRequestData(coapReq).then(msg => socket.send(msg));
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

    _establishWebsocket(coapConnection) {
        const id = this._generateId();
        const socket = this._createSocket(id);

        socket.on('open', () => {
            coapConnection.write(JSON.stringify({ id }));
        }).on('close', () => {
            this._resetCoapConnection(coapConnection, id);
        }).on('message', msg => {
            coapConnection.write(msg);
        }).on('error', error => {
            coapConnection.write(JSON.stringify({ error: 'Websocket error' }));
            this._resetCoapConnection(coapConnection, id);
        });

        coapConnection.on('finish', () => {
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