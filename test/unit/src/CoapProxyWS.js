const assert = require('assert');

const WS = require('ws');
const coap = require('coap');
const coapPacket = require('coap-packet');
const udp = require('dgram');

const CoapProxy = require('../../../src/CoapProxyWS');

const HOST_TEST = 'localhost';
const WS_PORT_TEST = 3456;
const COAP_PORT_TEST = 7458;
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
            socket.send('{"test":"test"}');
        });

        coap.request(coapRequestParams).on('response', res => {
            res.on('data', data => {
                const msg = JSON.parse(data.toString());

                if (typeof msg.status !== 'undefined' || typeof msg.id !== 'undefined') {
                    return;
                }

                assert.equal(msg.test, 'test');
                done();
            });
        }).end();
    });

    it('Should send first piggybacked response when ID is created', done => {
        let msgCount = 0;        
        coap.request(coapRequestParams).on('response', res => {
            res.on('data', data => {
                msgCount++;

                if (msgCount === 1) {
                    const msg = JSON.parse(data.toString());
                    assert.notEqual(typeof msg.id, 'undefined');
                    done();
                }
            });
        }).end();
    });

    it('Should send second message when WS socket is opened', done => {
        let msgCount = 0;
        coap.request(coapRequestParams).on('response', res => {
            res.on('data', data => {
                msgCount++;

                if (msgCount === 2) {
                    const msg = JSON.parse(data.toString());
                    assert.equal(msg.status, 0);
                    done();
                }
            });
        }).end();
    });

    it('Should proxy further coap observe requests as messages to WS server', done => {
        wsServer.on('connection', socket => {
            socket.on('message', msg => {
                assert.equal(msg.toString(), 'test');
                done();
            });
        });

        coap.registerOption('111', str => new Buffer(str), buff => buff.toString());

        coap.request(coapRequestParams).on('response', res => {
            let socketId = '';
            res.on('data', data => {
                const msg = JSON.parse(data.toString());
                
                if (msg.id) {
                    socketId = msg.id;
                } else if (msg.status === 0) {
                    const secondRequest = {
                        options: {
                            [SOCKET_ID_OPTION]: socketId
                        },
                        ...coapRequestParams
                    };

                    coap.request(secondRequest).end('test');
                }
            });
        }).end();
    });

    it('Should end coap connection readable stream if WS connection has been closed by WS server', done => {
        const client = udp.createSocket('udp4');

        wsServer.on('connection', socket => {
            socket.close();
        });

        sendObserveRequest(client);

        client.on('message', msg => {
            const packet = coapPacket.parse(msg);

            if (packet.code === '0.00') {
                client.close();
                done();
            }
        });
    });

    it('Should close WS connection with WS server if CoAP client has done reset', done => {
        const client = udp.createSocket('udp4');

        wsServer.on('connection', socket => {
            socket.on('close', () => {
                client.close();
                done();
            });
        });

        sendObserveRequest(client);

        client.on('message', msg => {
            const packet = coapPacket.parse(msg);
            const message = coapPacket.generate({
                reset: true,
                messageId: packet.messageId,
                code: '0.00'
            });

            client.send(message, 0, message.length, COAP_PORT_TEST, HOST_TEST);
        });
    });
});

function sendObserveRequest(client) {
    const message = coapPacket.generate({
        confirmable: true,
        token: new Buffer(3),
        options: [{
            name: 'Observe',
            value: new Buffer(0)
        }]
    });

    client.send(message, 0, message.length, COAP_PORT_TEST, HOST_TEST);
}