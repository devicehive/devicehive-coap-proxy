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
    let proxy;

    before(done => {
        wsServer = new WS.Server({ port: WS_PORT_TEST });

        proxy = new CoapProxy(`ws://${HOST_TEST}:${WS_PORT_TEST}`);
        proxy.listen(COAP_PORT_TEST).then(done);
    });

    afterEach(() => {
        wsServer.removeAllListeners('connection');
        wsServer.clients.forEach(c => c.close());
        proxy.maxWSConnections(0);
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

                if (typeof msg.id !== 'undefined' || typeof msg.test === 'undefined') {
                    return;
                }

                assert.equal(msg.test, 'test');
                done();
            });
        }).end();
    });

    it('Should send first piggybacked response in case request is valid (observe request) with status 0', done => {
        let msgCount = 0;
        coap.request(coapRequestParams).on('response', res => {
            res.on('data', data => {
                const msg = JSON.parse(data.toString());

                if (msgCount === 0 && msg.status === 0) {
                    done();
                    return;
                } else if (msgCount !== 0) {
                    done(new Error('First piggybacked response does not have status 0'));
                }

                msgCount++;
            });
        }).end();
    });

    it('Should send second response when WS is opened and ID is created', done => {
        let msgCount = 0;        
        coap.request(coapRequestParams).on('response', res => {
            res.on('data', data => {
                msgCount++;

                if (msgCount === 2) {
                    const msg = JSON.parse(data.toString());
                    assert.notEqual(typeof msg.id, 'undefined');
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
            res.on('data', data => {
                const msg = JSON.parse(data.toString());
                
                if (msg.id) {
                    const socketId = msg.id;
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

    it('Should respond with error in case request is not observe type', done => {
        coap.request({ port: COAP_PORT_TEST }).on('response', res => {
            res.on('data', data => {
                const msg = JSON.parse(data.toString());

                assert.equal(msg.error, 'Only Observe requests are supported');
                done();
            });
        }).end();
    });

    it('Should respond with error in case proxy has reached maximum WS connections', done => {
        proxy.maxWSConnections(1);

        coap.request(coapRequestParams).on('response', res => {
            res.on('data', data => {
                const msg = JSON.parse(data.toString());

                if (msg.id) {
                    coap.request(coapRequestParams).on('response', res => {
                        res.on('data', data => {
                            const msg = JSON.parse(data.toString());

                            if (msg.error) {
                                assert.equal(msg.error, 'proxy has reached maximum WS connections');
                                done();
                            }
                        });
                    }).end();
                }
            });
        }).end();
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