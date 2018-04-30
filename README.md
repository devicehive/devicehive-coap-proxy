# devicehive-coap-proxy
DeviceHive CoAP-Websockets proxy written in Node.js

# How to start
**Prerequisite: DeviceHive WebSocket API endpoint.**

1. Run CoAP proxy:
    - `docker build -t coap-proxy .`
    - `docker run -e DEBUG=coap-proxy -e PROXY.TARGET=ws://localhost/api/websocket coap-proxy`
2. In order to check connectivity run Node.js or Python example. Detailed instructions could be found [here](examples).

# How it works
- At the first step, issuing `Observe` request to CoAP proxy will open a new connection and create WebSocket session with the targeted DeviceHive instance;
- If connection was successfully established you'd receive socket `id` in the response (id of your Websocket session);
- All further requests should be non-`Observe` and contain `111` header with the specified socket `id` (from the previous step);
- All further responses will be pushed as a responses to the initial `Observe` request (which socketID were specified as a value of `111` header. See how it was handled in our examples: [Node.js](examples/node.js#L3) and [Python](examples/python.py#L22));
- DeviceHive CoAP API is identical to the Websocket one. Please, follow [this](https://docs.devicehive.com/docs/clientdevice) link to explore detailed description of supported message formats. 

# Configuration
This proxy has 5 properties to configure, you can override them with environment variables:
1. `PROXY.HOST` — Proxy server host (default localhost);
2. `PROXY.PORT` — Proxy server port (default 5683);
3. `PROXY.TARGET` — DeviceHive WebSocket API endpoint;
4. `PROXY.MAX_WS_CONNECTIONS` — Maximum number of Websocket connections that proxy is able to establish. After it reaches this value new CoAP clients won't be able to send new Observe requests;
5. `DEBUG` — To enable debug logging specify coap-proxy;

Or you can mount a volume to the Docker container (`config` directory).

# Establishing Observe connection
In order to establish new connection you'd initiate `Observe` request. In response you'd receive:
- Response with `id` property with value of your socket (you should use it for future non-`Observe` requests in `111` header)
<br /> OR
- `error` property with error message in case of failure.
