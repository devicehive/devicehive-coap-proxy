const coap = require('coap');
const http = require('http');
const url = require('url');

class CoapProxy {
    constructor({ targetHost, targetPort }) {
        this._targetHost = targetHost;
        this._targetPort = targetPort;
        this._server = coap.createServer();

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
            const httpReq = http.request({
                host: this._targetHost,
                port: this._targetPort,
                method: req.method,
                path: req.url,
                headers: this._extractHeaders(req.options)
            });

            req.pipe(httpReq).on('end', () => httpReq.end());
        });
    }

    _extractHeaders(options = []) {
        const optionHeaders  = {
            'Content-Format': 'Content-Type'
        };
        const headers = {};

        options.forEach(opt => {
            const h = optionHeaders[opt.name];
            if (h) {
                headers[h] = opt.value;
            }
        });

        return headers;
    }
}

module.exports = CoapProxy;