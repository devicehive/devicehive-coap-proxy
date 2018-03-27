# devicehive-coap-proxy
CoAP to WS proxy written in Node.js

# Request and response data format
Since DeviceHive interfaces use JSON as data format CoAP proxy will respond in JSON

# Configuration
This proxy has only 3 properties to configure, you can override them with environment variables:
1. `PROXY.HOST` — Proxy server host (default localhost)
2. `PROXY.PORT` — Proxy server port (default 5683)
3. `PROXY.TARGET` — URL of DeviceHive WebSocket API (or any other WebSocket API)

# Establishing Observe connection
To establish Observe connection you must initiate Observe request then you will receive piggybacked response right away with:
- `status` property with 0 value in case of success
<br /> OR
- `error` property with error message in case of failure (for now if request is not Observe)

Then you will receive object with:
- `id` property which means that connection established
<br /> OR
- `error` property with error message in case of failure

# How to push data through CoAP proxy
Once connection has been established issue new CoAP request with following headers:
- Observe header
- custom `111` header with your `id` value