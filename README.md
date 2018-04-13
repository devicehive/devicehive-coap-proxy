# devicehive-coap-proxy
CoAP to WS proxy written in Node.js

# How to start
**Prerequisite: DeviceHive with WebSocket API must be running.**

1. Run CoAP proxy:
    - Set up appropriate env variables in `docker-compose.yml` **(PROXY_TARGET is a must)**
    - `docker-compose up`
2. Run `npm run example`

Observe new Network and Device have been created for default DH admin user (dhadmin)

**Note: If you want to scale CoAP proxy ensure you have added more upstream servers in nginx/nginx.conf**

# Configuration
This proxy has only 3 properties to configure, you can override them with environment variables:
1. `PROXY.HOST` — Proxy server host (default localhost)
2. `PROXY.PORT` — Proxy server port (default 5683)
3. `PROXY.TARGET` — URL of DeviceHive WebSocket API (or any other WebSocket API)
4. `PROXY.MAX_WS_CONNECTIONS` — Max number of WS connections proxy can open with target, after WS connections reach this value new CoAP clients won't be able to connect with Observe request

Or you can share volume with Docker container (`config` directory)

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