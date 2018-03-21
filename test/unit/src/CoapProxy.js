const assert = require('assert');

const http = require('http');
const coap = require('coap');

const CoapProxy = require('../../../src/CoapProxy');

const HOST_TEST = 'localhost';
const HTTP_PORT_TEST = 7357;
const COAP_PORT_TEST = 7458;

describe('Coap Proxy module', function() {
    this.timeout(300);

    let httpServer;

    before(done => {
        httpServer = http.createServer();
        httpServer.listen(HTTP_PORT_TEST);

        const proxy = new CoapProxy({ targetHost: HOST_TEST, targetPort: HTTP_PORT_TEST });
        proxy.listen(COAP_PORT_TEST).then(done);
    });

    afterEach(() => {
        httpServer.removeAllListeners('request');
    });

    it('Should proxy CoAP request to HTTP server', done => {
        httpServer.on('request', (req, res) => {
            done();
        });
        coap.request({ host: HOST_TEST, port: COAP_PORT_TEST }).end();
    });

    it('Should proxy request with appropriate params', done => {
        httpServer.on('request', (req, res) => {           
            assert.equal(req.method, 'POST');
            assert.equal(req.url, '/coap/http/test?test=coap&to=http');

            done();
        });

        coap.request({
            host: HOST_TEST,
            port: COAP_PORT_TEST,
            method: 'POST',
            pathname: '/coap/http/test',
            query: 'test=coap&to=http'
        }).end();
    });

    it('Should proxy request with appropriate data', done => {
        httpServer.on('request', (req, res) => {
            const chunks = [];
            req.on('data', chunk => {
                chunks.push(chunk);
            }).on('end', () => {
                const data = Buffer.concat(chunks).toString();

                assert.equal(data, 'test');

                done();
            });
        });

        coap.request({
            host: HOST_TEST,
            port: COAP_PORT_TEST,
            method: 'POST'
        }).end('test');
    });
});