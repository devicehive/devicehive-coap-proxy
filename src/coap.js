const OutgoingMessage = require('coap/lib/outgoing_message');

const observeWriteStreamPath = 'coap/lib/observe_write_stream';
const ObserveWriteStream = require(observeWriteStreamPath);

// THIS IS WORKAROUND
// @TODO Contribute fix to the coap module
require.cache[require.resolve(observeWriteStreamPath)].exports = function(...args) {
    const stream = new ObserveWriteStream(...args);

    OutgoingMessage.apply(stream, args);

    return stream;
};

module.exports = require('coap');