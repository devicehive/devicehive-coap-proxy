const assert = require('assert');

const WS = require('ws');
const coap = require('coap');

const CoapProxy = require('../../../src/CoapProxyWS');

const HOST_TEST = 'localhost';
const WS_PORT_TEST = 7357;
const COAP_PORT_TEST = 7458;
const SOCKET_OPENED_MSG = JSON.stringify({ status: 0 });
const SOCKET_ID_OPTION = '111';

const coapRequestParams = {
    host: HOST_TEST,
    port: COAP_PORT_TEST,
    method: 'GET',
    observe: true
};

describe('Coap Proxy module', function() {
    this.timeout(300);

    let wsServer;

    before(done => {
        wsServer = new WS.Server({ port: WS_PORT_TEST });

        const proxy = new CoapProxy({ targetHost: HOST_TEST, targetPort: WS_PORT_TEST });
        proxy.listen(COAP_PORT_TEST).then(done);
    });

    afterEach(() => {
        wsServer.removeAllListeners('connection');
    });

    it('Should proxy CoAP request to WS server', done => {
        wsServer.on('connection', socket => {
            done();
        });

        coap.request(coapRequestParams).end();
    });

    it('Should proxy messages from WS server', done => {
        wsServer.on('connection', socket => {
            socket.send('test');
        });

        coap.request(coapRequestParams).on('response', res => {
            res.on('data', data => {
                const msg = data.toString();

                if (msg === SOCKET_OPENED_MSG) {
                    return;
                }

                assert.equal(msg, 'test');
                done();
            });
        }).end();
    });

    it('Should send first message when WS socket is opened', done => {
        coap.request(coapRequestParams).on('response', res => {
            res.on('data', data => {
                assert.equal(data.toString(), SOCKET_OPENED_MSG);
                done();
            });
        }).end();
    });

    it('Should respond with custom option as unique socket ID', done => {
        coap.request(coapRequestParams).on('response', res => {
            const socketId = res.options[1].value;            
            assert.equal(res.options[1].name, SOCKET_ID_OPTION);
            assert.notEqual(socketId, '');
            done();
        }).end();
    });

    it('Should proxy further coap observe requests as messages to WS server', done => {
        wsServer.on('connection', socket => {
            socket.on('message', msg => {
                assert.equal(msg, 'test');
                done();
            });
        });

        coap.request(coapRequestParams).on('response', res => {
            const socketId = res.options[1].value;
            const secondRequest = {
                options: {
                    [SOCKET_ID_OPTION]: socketId
                },
                ...coapRequestParams
            };

            coap.request(secondRequest).end('test');
        }).end();
    });

    // @TODO Client does not react to reset message
    // it('Should end coap connection readable stream if WS connection has been closed by WS server', done => {
    //     wsServer.on('connection', socket => {
    //         socket.close();
    //     });

    //     const req = coap.request(coapRequestParams);
        
    //     req.on('response', res => {
    //         res.on('finish', done);
    //     }).end();
    // });
});