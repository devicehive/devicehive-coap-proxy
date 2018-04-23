#!/usr/bin/python


from coapthon import defines
from coapthon.messages.request import Request
from coapthon.utils import generate_random_token
from coapthon.messages.option import Option
from coapthon.client.helperclient import HelperClient
import json
import time

# Options
SERVER_HOST = '127.0.0.1'
SERVER_PORT = 5683
# Put you access token
ACCESS_TOKEN = 'YOUR_ACCESS_TOKEN'

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

    def __init__(self, host, port, path='/', timeout=30, response_timeout=0.01):
        self._message_id = None
        self._response = None
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

    def _sync_request(self, payload='', *options):
        request = self._observe_request(self._path, options)
        if payload != '':
            request.payload = payload
        self._client.send_request(request, self._sync_response, self._timeout)
        self._response = None
        self._wait_response()

    def _sync_message_id_request(self, payload):
        self._sync_request(payload, (MESSAGE_ID_OPTION, self._message_id))

    def _sync_response(self, response):
        self._response = response

    def _wait_response(self):
        while self._response is None:
            time.sleep(self._response_timeout)

    def _status_request(self):
        self._sync_request()
        response = json.loads(self._response.payload)
        if response['status'] != 0:
            raise DeviceHiveCoAPClientException('invalid status: %s' %
                                                response['status'])
        self._response = None
        self._wait_response()
        response = json.loads(self._response.payload)
        self._message_id = response['id']

    def authorize(self, access_token):
        # TODO: finish method after bug fixing.
        payload = json.dumps({'action': 'authenticate', 'token': access_token})
        self._sync_message_id_request(payload)
        self._wait_response()
        response = json.loads(self._response.payload)
        print(response)
        self._response = None
        self._wait_response()
        response = json.loads(self._response.payload)
        print(response)

dh_client = DeviceHiveCoAPClient(SERVER_HOST, SERVER_PORT)
dh_client.authorize(ACCESS_TOKEN)
