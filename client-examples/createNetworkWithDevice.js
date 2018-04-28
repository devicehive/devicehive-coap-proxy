const coap = require('coap');

coap.registerOption('111', Buffer, String);

const reqParams = {
    host: 'localhost',
    port: 53
};

const obsReqParams  = {
    observe: true,
    ...reqParams
};

coap.request(obsReqParams).on('response', resStream => {
    resStream.on('data', data => {
        const msg = JSON.parse(data.toString());

        if (msg.id) {
            reqParams.headers = {
                111: msg.id
            };

            createToken();
        } else if (msg.accessToken) {
            auth(msg.accessToken);
        } else if (msg.action === 'authenticate' && msg.status === 'success') {
            createNetwork();
        } else if (msg.action === 'network/insert' && msg.status === 'success') {
            createDevice(msg.network.id);
        }

        console.log(msg);
    });
}).end();

function createToken() {
    coap.request(reqParams).end(JSON.stringify({
        action: 'token',
        login: 'dhadmin',
        password: 'dhadmin_#911'
    }));
}

function auth(accessToken) {
    coap.request(reqParams).end(JSON.stringify({
        action: 'authenticate',
        token: accessToken
    }));
}

function createNetwork() {
    coap.request(reqParams).end(JSON.stringify({
        action: 'network/insert',
        network: {
            name: 'coap-test-network',
            description: 'testing CoAP proxy'
        }
    }));
}

function createDevice(networkId) {
    coap.request(reqParams).end(JSON.stringify({
        action: 'device/save',
        deviceId: 'coap-test-device',
        device: {
            name: 'coap-test-device',
            networkId
        }
    }));
}