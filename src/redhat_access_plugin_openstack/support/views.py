import logging

from django import http
from horizon import views
#TODO: Remove this
from django.views.decorators.csrf import csrf_exempt

import shlex
import subprocess
import requests
import json
import base64

apiBaseUri = 'https://api.access.redhat.com/rs'
LOG = logging.getLogger(__name__)


class IndexView(views.APIView):
    template_name = 'redhat_access_plugin_openstack/support/index.html'

    def get_data(self, request, context, *args, **kwargs):
        return context


#TODO: Remove this!
@csrf_exempt
def attachments(request):
    if request.method == 'GET':
        response = http.HttpResponse(content_type='text/plain')
        response.write("Horizon Log")
        response.flush()
        return response
    elif request.method == 'POST':
        requestObj = json.loads(request.body)

        try:
            caseNum = requestObj['caseNum']
            authToken = requestObj['authToken']
            attachment = requestObj['attachment']
            LOG.debug("Case Number: %s" % caseNum)
            LOG.debug("Auth Token: %s" % authToken)
            LOG.debug("Attachment: %s" % attachment)
        except:
            LOG.error("Missing caseNum, authToken, or attachment")
            return http.HttpResponseBadRequest("Required field missing")

        try:
            decoded = base64.b64decode(authToken)
            user, password = decoded.split(':')
        except:
            LOG.error("Could not decode authToken")
            return http.HttpResponseBadRequest("Could not decode authToken")

        authToken = 'Basic ' + authToken
        headers = {'Authorization': authToken}
        LOG.debug("Headers: %s" % str(headers))

        loginUri = apiBaseUri + '/users?ssoUserName=' + user
        attachUrl = apiBaseUri + '/cases/' + caseNum + '/attachments'

        loginReq = requests.get(loginUri, headers=headers)
        LOG.debug("Validate credentials")
        rc = checkRC(loginReq)
        if rc.status_code == 200:
            try:
                files = {'file': open('/var/log/horizon/horizon.log', 'rb')}
            except:
                LOG.error("Could not open Horizon Log")
                return http.HttpResponseServerError("Couldnt open horizon log")
            LOG.debug("POST attachment")
            r = requests.post(attachUrl, files=files, headers=headers)
            return checkRC(r)
        else:
            return rc
    else:
        LOG.error("Unsupported Method")
        return http.HttpResponseNotAllowed(['GET', 'POST'])


def checkRC(r):
    if r.status_code < 400:
        LOG.debug("Response OK: %s" % str(r.status_code))
        return http.HttpResponse()
    #Auth was bad pass it up, use 409 Conflict?
    elif r.status_code == 401:
        LOG.debug("Response 401")
        response = HttpResponse()
        response.status_code = 409
        return response
    else:
        LOG.debug("Response Bad: %s" % str(r.status_code))
        return http.HttpResponseServerError(str(r.status_code))
