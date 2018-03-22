const coap = require('coap');
const WS = require('ws');

class CoapProxy {
    constructor({ targetHost, targetPort }) {
        this._targetHost = targetHost;
        this._targetPort = targetPort;
        this._server = coap.createServer();
        this._sockets = new Map();

        this._proxy();
    }

    listen(port, address = 'localhost') {
        return new Promise((resolve, reject) => {
            this._server.listen(port, address, () => {
                resolve();
            });
        });
    }

    _proxy() {
        this._server.on('request', (req, res) => {
            if (typeof req.headers.Observe !== 'undefined') {
                this._handleObserveRequest(req, res);
            }
        });
    }

    _handleObserveRequest(coapReq, coapConnection) {
        const id = this._getSocketIdOption(coapReq.options);
        const socket = id && this._sockets.get(id.value.toString());

        if (socket) {   
            this._readAllCoapRequestData(coapReq).then(msg => socket.send(msg));
        } else {            
            const id = this._establishWebsocket(coapConnection);

            this._piggybackedResponse(coapConnection, id);
        }
    }

    _getSocketIdOption(options = []) {
        return options.filter(opt => opt.name === CoapProxy.SOCKET_ID_OPTION)[0];
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

    _piggybackedResponse(coapConnection, id) {        
        coapConnection.write(JSON.stringify({ id }));
    }

    _establishWebsocket(coapConnection) {
        const id = this._generateId();
        const socket = this._createSocket(id);

        socket.on('open', () => {
            coapConnection.write(JSON.stringify({ status: 0 }));
        }).on('close', () => {
            coapConnection._packet.options = [];
            coapConnection.reset();
            this._deleteSocket(id);
        }).on('message', msg => {
            coapConnection.write(msg);
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
        const socket = new WS(`ws://${this._targetHost}:${this._targetPort}`);
        this._sockets.set(id, socket);

        return socket;
    }

    _deleteSocket(id) {
        this._sockets.delete(id);
    }

    static get SOCKET_ID_OPTION() { return '111'; }
}

module.exports = CoapProxy;