const CoapProxy = require('./src/CoapProxyWS');
const config = require('./config').proxy;

const proxy = new CoapProxy({
    targetHost: config.TARGET_HOST,
    targetPort: config.TARGET_PORT
});

proxy.listen(config.PORT, config.HOST).then(() => {
    console.log(`CoAP proxy is listening on ${config.PORT}`);
});