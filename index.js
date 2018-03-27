const debug = require('debug')('coap-proxy');

const CoapProxy = require('./src/CoapProxyWS');
const config = require('./config').proxy;

debug(`Starting CoAP proxy with configs: ${JSON.stringify(config, null, 4)}`);

const proxy = new CoapProxy(config.TARGET);

proxy.listen(config.PORT, config.HOST).then(() => {
    debug(`CoAP proxy is listening on ${config.PORT}`);
});