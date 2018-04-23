#!/usr/bin/python


from coapthon import defines
from coapthon.messages.request import Request
from coapthon.utils import generate_random_token
from coapthon.messages.option import Option
from coapthon.client.helperclient import HelperClient
import json
import time
import uuid

# Options
SERVER_HOST = '127.0.0.1'
SERVER_PORT = 5683
# Put your access token
ACCESS_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJwYXlsb2FkIjp7ImEiOlsyLDMsNCw1LDYsNyw4LDksMTAsMTEsMTIsMTUsMTYsMTddLCJlIjoxNTI0NDk0MzI4OTk1LCJ0IjoxLCJ1IjoyMzg4NiwibiI6WyIyMDE2MyJdLCJkdCI6WyIqIl19fQ.1fvGx-tFraJwHD7yu6RoKbivmjFuwiMsSfg_5jEiic4'
# Put your device id
DEVICE_ID = 'CoAP-python-test-device'

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

    def __init__(self, host, port, path='/', timeout=None,
                 response_timeout=0.01):
        self._message_id = None
        self._response = None
        self._responses = {}
        self._path = path
        self._timeout = timeout
        self._response_timeout = response_timeout
        self._client = HelperClient(server=(host, port))
        self._status_request()

    def _observe_request(self, path, options):
        request = Request()
        request.destination = self._client.server
        request.code = defines.Codes.GET.number
        request.uri_path = path
        request.token = generate_random_token(2)
        request.observe = 0
        for number, value in options:
            option = Option()
            option.number = number
            option.value = value
            request.add_option(option)
        return request

    def _async_request(self, callback, payload='', *options):
        request = self._observe_request(self._path, options)
        if payload != '':
            request.payload = payload
        self._client.send_request(request, callback, self._timeout)

    def _async_message_id_request(self, callback, payload):
        self._async_request(callback, payload, (MESSAGE_ID_OPTION,
                                                self._message_id))

    def _sync_request(self, payload='', *options):
        self._async_request(self._sync_response, payload, *options)
        self._response = None
        self._wait_response()

    def _sync_message_id_request(self, payload):
        self._sync_request(payload, (MESSAGE_ID_OPTION, self._message_id))

    def _sync_response(self, response):
        self._response = response

    def _wait_response(self, request_id=None):
        if request_id is not None:
            response = self._responses.get(request_id)
            if response is not None:
                self._response = response
                del self._responses[request_id]
        while self._response is None:
            time.sleep(self._response_timeout)
        if request_id is None:
            return
        payload = self._decode_response_payload(self._response)
        if payload['requestId'] != request_id:
            self._responses[request_id] = self._response
            self._wait_response(request_id)

    @staticmethod
    def _encode_request_payload(payload):
        request_id = str(uuid.uuid4())
        payload['requestId'] = request_id
        return json.dumps(payload), request_id

    @staticmethod
    def _decode_response_payload(response):
        return json.loads(response.payload)

    def _status_request(self):
        self._sync_request()
        payload = self._decode_response_payload(self._response)
        if payload['status'] != 0:
            raise DeviceHiveCoAPClientException('invalid status: %s' %
                                                payload['status'])
        self._response = None
        self._wait_response()
        payload = self._decode_response_payload(self._response)
        self._message_id = payload['id']

    def _handle_response_payload(self, response):
        payload = self._decode_response_payload(response)
        if payload['status'] != 'success':
            raise DeviceHiveCoAPClientException(
                'response code: %s, error: %s' % (payload['code'],
                                                  payload['error']))
        return payload

    def _send_sync_request(self, request_payload):
        payload, request_id = self._encode_request_payload(request_payload)
        self._sync_message_id_request(payload)
        self._wait_response(request_id)
        return self._handle_response_payload(self._response)

    def authorize(self, access_token):
        request_payload = {
            'action': 'authenticate',
            'token': access_token,
        }
        self._send_sync_request(request_payload)

    def create_device(self, device_id):
        request_payload = {
            'action': 'device/save',
            'deviceId': device_id,
            'device': {
                'name': device_id
            }
        }
        self._send_sync_request(request_payload)


dh_client = DeviceHiveCoAPClient(SERVER_HOST, SERVER_PORT)
dh_client.authorize(ACCESS_TOKEN)
dh_client.create_device(DEVICE_ID)
