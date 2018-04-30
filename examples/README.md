# Examples
Both of examples (Node.js and Python) execute the following flow:
- Authenticate _(Node.js example authenticates by default credentials, meanwhile Python directly by access token)_
- Create device
- Subscribe for commands and notifications for just created device
- Send command, command update and notification

So as a result of execution you will see notification and command payloads received from DeviceHive.

# How to run
## Python
1. `pip install CoAPthon`
2. Set your access token to `ACCESS_TOKEN` variable in `python.py`
3. `python python.py`

## Node.js
1. Execute `npm i` in app root
2. Execute `npm run example` in app root