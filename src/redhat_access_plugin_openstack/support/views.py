from django import http
from horizon import views

import shlex
import subprocess
import requests
import json


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

        authToken = 'Basic ' + authToken
        portalUrl = 'https://api.devgssci.devlab.phx1.access.redhat.com/rs/cases/' + caseNum \
            + '/attachments'
        headers = {'Authorization': authToken}

        files = {'file': open('/var/log/horizon/horizon.log', 'rb')}

        r = requests.post(portalUrl, files=files, headers=headers)

        if r.status_code == requests.codes.ok:
            return http.HttpResponse()
        elif r.status_code == 401:
            #Auth was bad pass it up, use 409 Conflict?
            response = HttpResponse()
            response.status_code = 409
            return response
        else:
            return http.HttpResponseServerError()
