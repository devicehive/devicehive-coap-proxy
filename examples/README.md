# Examples
Both of examples (Node.js and Python) execute the followin flow:
- Authenticate _(Node.js example authenticates by default credentials, meanwhile Python directly by access token)_
- Create device
- Subscribe for commands and notifications for just created device
- Send command, command update and notification

So as a result of execution you will see notification and command payloads received from DeviceHive.