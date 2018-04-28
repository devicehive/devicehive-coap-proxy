#!/usr/bin/python

from coapthon import defines
from coapthon.messages.option import Option
from coapthon.utils import generate_random_token
from coapthon.client import helperclient
import json
import time
import uuid

# Options
SERVER_HOST = '127.0.0.1'
SERVER_PORT = 5683
# Put your access token
ACCESS_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJwYXlsb2FkIjp7ImEiOlsyLDMsNCw1LDYsNyw4LDksMTAsMTEsMTIsMTUsMTYsMTddLCJlIjoxNTI0OTA1MDYyNTk4LCJ0IjoxLCJ1IjoyMzg4NiwibiI6WyIyMDE2MyJdLCJkdCI6WyIqIl19fQ.JPJDKTkMab9dbZ4GKEsCQNgJBIb9_v-cUImAnTnyoRU'
# Put your device id
DEVICE_ID = 'CoAP-Python-Test-Device'
DEVICE_COMMAND = 'Test-Command'

# Message id option
MESSAGE_ID_OPTION = 111

# Register message id option
defines.OptionRegistry.LIST[MESSAGE_ID_OPTION] = \
    defines.OptionItem(MESSAGE_ID_OPTION, "MESSAGE_ID", defines.STRING,
                       False, None)


class HelperClient(helperclient.HelperClient):
    """Helper client"""

    def post(self, path, payload, callback=None, timeout=None, *options):
        request = self.mk_request(defines.Codes.POST, path)
        request.token = generate_random_token(2)
        request.payload = payload
        for number, value in options:
            option = Option()
            option.number = number
            option.value = value
            request.add_option(option)
        return self.send_request(request, callback, timeout)


class DeviceHiveCoAPClientException(Exception):
    """DeviceHive CoAP client exception"""


class DeviceHiveCoAPClient(object):
    """DeviceHive CoAP client"""

    def __init__(self, host, port, path='/', timeout=None, event_timeout=0.001):
        self._host = host
        self._port = port
        self._path = path
        self._timeout = timeout
        self._event_timeout = event_timeout
        self._events = {}
        self._message_id = None
        self._event_client = None
        self._command_insert_handler = None
        self._command_update_handler = None
        self._notification_handler = None
        self._event_request()

    def _client(self):
        return HelperClient(server=(self._host, self._port))

    def _event_request(self):
        self._event_client = self._client()
        self._event_client.observe(self._path, self._event_callback,
                                   self._timeout)

    def _event_callback(self, response):
        if response.payload is None:
            return
        payload = self._decode_response_payload(response.payload)
        if self._message_id is None:
            self._message_id = payload['id']
            return
        request_id = payload.get('requestId')
        if request_id is not None:
            self._events[request_id] = payload
            return
        action = payload['action']
        if action == 'command/insert' \
                and self._command_insert_handler is not None:
            self._command_insert_handler(self, payload['command'])
        if action == 'command/update' \
                and self._command_update_handler is not None:
            self._command_update_handler(self, payload['command'])

    @staticmethod
    def _decode_response_payload(payload):
        return json.loads(payload)

    @staticmethod
    def _encode_request_payload(payload):
        return json.dumps(payload)

    def _wait_message_id(self):
        while self._message_id is None:
            time.sleep(self._event_timeout)

    def _wait_event(self, request_id):
        while True:
            time.sleep(self._event_timeout)
            event = self._events.get(request_id)
            if event is not None:
                del self._events[request_id]
                return event

    def _message_id_request(self, payload):
        self._wait_message_id()
        request_id = str(uuid.uuid4())
        payload['requestId'] = request_id
        payload = self._encode_request_payload(payload)
        request_client = self._client()

        def response_callback(_):
            request_client.stop()
        request_client.post(self._path, payload, response_callback,
                            self._timeout, (MESSAGE_ID_OPTION,
                                            self._message_id))
        return request_id

    def _wait_message_id_request(self, payload):
        request_id = self._message_id_request(payload)
        payload = self._wait_event(request_id)
        if payload['status'] != 'success':
            self.stop()
            raise DeviceHiveCoAPClientException(
                'response code: %s, error: %s' % (payload['code'],
                                                  payload['error']))
        return payload

    def authorize(self, access_token):
        payload = {
            'action': 'authenticate',
            'token': access_token,
        }
        self._wait_message_id_request(payload)

    def create_device(self, device_id):
        payload = {
            'action': 'device/save',
            'deviceId': device_id,
            'device': {
                'name': device_id
            }
        }
        self._wait_message_id_request(payload)

    def send_command(self, device_id, command_name):
        payload = {
            'action': 'command/insert',
            'deviceId': device_id,
            'command': {
                'command': command_name
            }
        }
        return self._wait_message_id_request(payload)['command']['id']

    def update_command(self, device_id, command_id, status, result):
        payload = {
            'action': 'command/update',
            'deviceId': device_id,
            'commandId': command_id,
            'command': {
                'status': status,
                'result': result
            }
        }
        self._wait_message_id_request(payload)

    def subscribe_command_insert(self, device_id, handler):
        self._command_insert_handler = handler
        payload = {
            'action': 'command/subscribe',
            'deviceId': device_id,
        }
        return self._wait_message_id_request(payload)['subscriptionId']

    def subscribe_command_update(self, device_id, handler):
        self._command_update_handler = handler
        payload = {
            'action': 'command/subscribe',
            'deviceId': device_id,
            'returnUpdatedCommands': True
        }
        return self._wait_message_id_request(payload)['subscriptionId']

    def stop(self):
        self._event_client.stop()


def handle_command_insert(_, command):
    print('---COMMAND-INSERTED---')
    print(command)


def handle_command_update(_, command):
    print('---COMMAND-UPDATED---')
    print(command)


dh_client = DeviceHiveCoAPClient(SERVER_HOST, SERVER_PORT)
dh_client.authorize(ACCESS_TOKEN)
dh_client.create_device(DEVICE_ID)
dh_client.subscribe_command_insert(DEVICE_ID, handle_command_insert)
dh_client.subscribe_command_update(DEVICE_ID, handle_command_update)
command_id = dh_client.send_command(DEVICE_ID, DEVICE_COMMAND)
dh_client.update_command(DEVICE_ID, command_id, 'updated', {'result': True})
