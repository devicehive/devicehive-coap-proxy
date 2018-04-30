const coap = require('coap');

coap.registerOption('111', Buffer, String);

const reqParams = {
    host: 'localhost',
    port: 5683
};

const obsReqParams  = {
    observe: true,
    ...reqParams
};

const ACCESS_TOKEN = 'YOUR_ACCESS_TOKEN';

const DEVICE_ID = 'coap-test-node';
const COMMAND = 'coap-test-node-command';
const COMMAND_UPDATED_STATUS = 'updated';
const NOTIFICATION = 'coap-test-node-notification';

coap.request(obsReqParams).on('response', resStream => {
    let commandsSubscribed = false;
    resStream.on('data', data => {
        const msg = JSON.parse(data.toString());

        if (msg.id) {
            reqParams.headers = {
                111: msg.id
            };

            auth(ACCESS_TOKEN);
        }
        
        if (isSuccess(msg)) {
            if (msg.action === 'authenticate') {
                createDevice(DEVICE_ID);
            } else if (msg.action === 'device/save') {
                subscribeCommandInsert(DEVICE_ID);
                subscribeCommandUpdate(DEVICE_ID);
                subscribeNotification(DEVICE_ID);
            } else if (msg.action === 'command/subscribe' && !commandsSubscribed) {
                console.log('Subscribed for commands');
                commandsSubscribed = true;
                sendCommand(DEVICE_ID, COMMAND);
            } else if (msg.action === 'notification/subscribe') {
                console.log('Subscribed for notifications');
                sendNotification(DEVICE_ID, NOTIFICATION);
            } else if (msg.action === 'command/insert') {
                updateCommand(DEVICE_ID, msg.command.id, COMMAND_UPDATED_STATUS);
            }
        } else {
            handleSubscription(msg);            
        }
    });
}).end();

function isSuccess(msg) {
    return msg.status === 'success';
}

function auth(accessToken) {
    coap.request(reqParams).end(JSON.stringify({
        action: 'authenticate',
        token: accessToken
    }));
}

function createDevice(deviceId) {
    coap.request(reqParams).end(JSON.stringify({
        action: 'device/save',
        device: {
            name: deviceId
        },
        deviceId
    }));
}

function subscribeCommandInsert(deviceId) {
    coap.request(reqParams).end(JSON.stringify({
        action: 'command/subscribe',
        deviceId
    }));
}

function subscribeCommandUpdate(deviceId) {
    coap.request(reqParams).end(JSON.stringify({
        action: 'command/subscribe',
        returnUpdatedCommands: true,
        deviceId
    }));
}

function subscribeNotification(deviceId) {
    coap.request(reqParams).end(JSON.stringify({
        action: 'notification/subscribe',
        deviceId
    }));
}

function sendCommand(deviceId, commandName) {
    coap.request(reqParams).end(JSON.stringify({
        action: 'command/insert',
        deviceId,
        command: {
            command: commandName
        }
    }));
}

function updateCommand(deviceId, commandId, commandStatus) {
    coap.request(reqParams).end(JSON.stringify({
        action: 'command/update',
        deviceId,
        commandId,
        command: {
            status: commandStatus
        }
    }));
}

function sendNotification(deviceId, notificationName) {
    coap.request(reqParams).end(JSON.stringify({
        action: 'notification/insert',
        deviceId,
        notification: {
            notification: notificationName
        }
    }));
}

function handleSubscription(msg) {
    if (typeof msg.status === 'undefined') {
        if (msg.action === 'command/insert') {
            console.log('---COMMAND-INSERTED---');
            console.log(msg.command);
        } else if (msg.action === 'command/update') {
            console.log('---COMMAND-UPDATED---');
            console.log(msg.command);
        } else if (msg.action === 'notification/insert') {
            console.log('---NOTIFICATION---');
            console.log(msg.notification);
        }

        console.log('\n');
    }
}
