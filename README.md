# devicehive-coap-proxy
CoAP to WS proxy written in Node.js

# How to start
**Prerequisite: DeviceHive with WebSocket API must be running.**

1. Run CoAP proxy:
    - Set up appropriate env variables in `docker-compose.yml` **(PROXY_TARGET is a must)**
        - `docker-compose.yml` configuration example:
            ```
            environment:
              - ENVSEPARATOR=_
              - DEBUG=coap-proxy
              - PROXY_TARGET=ws://playground-dev.devicehive.com/api/websocket
            ```
    - `docker-compose up`
2. Run `npm run example` to launch Node.js example

Observe new Device have been created for default DH admin user (dhadmin)

# How it works
- To open connection issue Observe request to CoAP proxy and this will open WebSocket to the specified target
- Messages which proxy pushes to your client contain `Observe` header and token of observation. This means that every message from proxy will be a response to first Observe request that initiated connection. (See how it handled in [Node.js example](https://github.com/devicehive/devicehive-coap-proxy/blob/development/examples/createNetworkWithDevice.js#L20))
- To communicate with target WS server through CoAP proxy you must use not Observe requests with `111` header with socket ID you will receive after successful connection establishment. See [Node.js](https://github.com/devicehive/devicehive-coap-proxy/blob/development/examples/createNetworkWithDevice.js#L3) and [Python](https://github.com/devicehive/devicehive-coap-proxy/blob/development/examples/example.py#L22) examples
- Proxy uses JSON as data format for communication

# Configuration
This proxy has 5 properties to configure, you can override them with environment variables:
1. `PROXY.HOST` — Proxy server host (default localhost)
2. `PROXY.PORT` — Proxy server port (default 5683)
3. `PROXY.TARGET` — URL of DeviceHive WebSocket API (or any other WebSocket API)
4. `PROXY.MAX_WS_CONNECTIONS` — Max number of WS connections proxy can open with target, after WS connections reach this value new CoAP clients won't be able to connect with Observe request
5. `DEBUG` — To enable debug logging specify coap-proxy

Or you can share volume with Docker container (`config` directory)

# Establishing Observe connection
To establish Observe connection you must initiate Observe request then you will receive either:
- Response with `id` property with value of your socket (you must use it for further not Observe requests in `111` header)
<br /> OR
- `error` property with error message in case of failure
