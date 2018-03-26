const coap = require('coap');

coap.registerOption('111', Buffer, String);

const reqParams = {
    observe: true
};

coap.request(reqParams).on('response', resStream => {
    resStream.on('data', data => {
        const msg = JSON.parse(data.toString());

        console.log(msg);

        if (msg.id) {
            reqParams.headers = {
                111: msg.id
            };

            createToken();
        } else if (msg.accessToken) {
            auth(msg.accessToken);
        } else if (msg.action === 'authenticate' && msg.status === 'success') {
            createDevice();
        }
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

function createDevice() {
    coap.request(reqParams).end(JSON.stringify({
        action: 'device/save',
        deviceId: 'coap-test',
        device: {
            name: 'coap-test',
            networkId: 1
        }
    }));
}