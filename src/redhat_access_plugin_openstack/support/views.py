from django import http
from horizon import views

import shlex
import subprocess
import requests
import json
import base64

apiBaseUri = 'https://api.access.redhat.com/rs'


class IndexView(views.APIView):
    template_name = 'redhat_access_plugin_openstack/support/index.html'

    def get_data(self, request, context, *args, **kwargs):
        return context


def attachments(request):
    if request.method == 'GET':
        response = http.HttpResponse(content_type='text/plain')
        response.write("Horizon Log")
        response.flush()
        return response
    elif request.method == 'POST':
        requestObj = json.loads(request.body)

        caseNum = requestObj['caseNum']
        authToken = 'Basic ' + requestObj['auth']

        #Need to return if request is bad
        if (caseNum is None) or (authToken is None):
            return http.HttpResponseBadRequest()

        decoded = base64.b64decode(authToken)
        user, password = decoded.split(':')

        authToken = 'Basic ' + authToken
        headers = {'Authorization': authToken}

        loginUri = apiBaseUri + '/users?ssoUserName=' + user
        attachUrl = apiBaseUri + '/cases/' + caseNum + '/attachments'

        loginReq = requests.get(loginUri, headers=headers)
        rc = checkRC(loginReq)
        if rc.status_code == 200:
            files = {'file': open('/var/log/horizon/horizon.log', 'rb')}
            r = requests.post(attachUrl, files=files, headers=headers)
            return checkRC(r)
        else:
            return rc


def checkRC(r):
    if r.status_code == requests.codes.ok:
        return http.HttpResponse()
    #Auth was bad pass it up, use 409 Conflict?
    elif r.status_code == 401:
        response = HttpResponse()
        response.status_code = 409
        return response
    else:
        return http.HttpResponseServerError()
