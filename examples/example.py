#!/usr/bin/python

from coapthon import defines
from coapthon.messages.request import Request
from coapthon.messages.option import Option
from coapthon.client.helperclient import HelperClient
import json
import time
import uuid

# Options
SERVER_HOST = '127.0.0.1'
SERVER_PORT = 5683
# Put your access token
ACCESS_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJwYXlsb2FkIjp7ImEiOlsyLDMsNCw1LDYsNyw4LDksMTAsMTEsMTIsMTUsMTYsMTddLCJlIjoxNTI0NzQ5ODcxNDUwLCJ0IjoxLCJ1IjoyMzg4NiwibiI6WyIyMDE2MyJdLCJkdCI6WyIqIl19fQ.gGPFn8p_BXCbhmXZTPDRUZCkMmglpE8wdLmROFSCBCk'
# Put your device id
DEVICE_ID = 'CoAP-python-test-device'
DEVICE_COMMAND = 'Test-command'

# Message id option
MESSAGE_ID_OPTION = 111

# Register message id option
defines.OptionRegistry.LIST[MESSAGE_ID_OPTION] = \
    defines.OptionItem(MESSAGE_ID_OPTION, "MESSAGE_ID", defines.STRING,
                       False, None)


class DeviceHiveCoAPClientException(Exception):
    """DeviceHive CoAP client exception"""


class DeviceHiveCoAPClient(object):
    """DeviceHive CoAP client"""

    def __init__(self, host, port, event_timeout=0.001, path='/', timeout=None):
        self._message_id = None
        self._events = {}
        self._event_timeout = event_timeout
        self._path = path
        self._timeout = timeout
        self._client = HelperClient(server=(host, port))
        self._event_observe_request()

    def _observe_request(self, path, *options):
        request = Request()
        request.destination = self._client.server
        request.code = defines.Codes.GET.number
        request.uri_path = path
        request.observe = 0
        for number, value in options:
            option = Option()
            option.number = number
            option.value = value
            request.add_option(option)
        return request

    @staticmethod
    def _decode_response_payload(payload):
        return json.loads(payload)

    @staticmethod
    def _encode_request_payload(payload):
        return json.dumps(payload)

    def _event_observe_callback(self, response):
        payload = self._decode_response_payload(response.payload)
        if self._message_id is None:
            self._message_id = payload['id']
            return
        self._events[payload['requestId']] = payload
        print(self._events)

    def _event_observe_request(self):
        request = self._observe_request(self._path)
        self._client.send_request(request, self._event_observe_callback,
                                  self._timeout)

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

    def _message_id_observe_request(self, payload):
        self._wait_message_id()
        request_id = str(uuid.uuid4())
        request = self._observe_request(self._path, (MESSAGE_ID_OPTION,
                                                     self._message_id))
        payload['requestId'] = request_id
        request.payload = self._encode_request_payload(payload)

        def empty_callback(response):
            print('---response---')
            print(response)
        self._client.send_request(request, empty_callback, self._timeout)
        return request_id

    def _sync_message_id_observe_request(self, payload):
        request_id = self._message_id_observe_request(payload)
        payload = self._wait_event(request_id)
        if payload['status'] != 'success':
            raise DeviceHiveCoAPClientException(
                'response code: %s, error: %s' % (payload['code'],
                                                  payload['error']))
        return payload

    def authorize(self, access_token):
        payload = {
            'action': 'authenticate',
            'token': access_token,
        }
        self._sync_message_id_observe_request(payload)

    def create_device(self, device_id):
        payload = {
            'action': 'device/save',
            'deviceId': device_id,
            'device': {
                'name': device_id
            }
        }
        self._sync_message_id_observe_request(payload)

    def send_command(self, device_id, command_name):
        payload = {
            'action': 'notification/insert',
            'deviceId': device_id,
            'command': {
                'command': command_name
            }
        }
        payload = self._sync_message_id_observe_request(payload)
        print(payload)

dh_client = DeviceHiveCoAPClient(SERVER_HOST, SERVER_PORT)
dh_client.authorize(ACCESS_TOKEN)
dh_client.create_device(DEVICE_ID)
print('!!!')
dh_client.send_command(DEVICE_ID, DEVICE_COMMAND)
print('!!!!!!')
