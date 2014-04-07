from django import http
from horizon import views

import shlex
import subprocess


class IndexView(views.APIView):
    template_name = 'redhat_access_plugin_openstack/support/index.html'

    def get_data(self, request, context, *args, **kwargs):
        return context


def attachments(request):
    if request.method == 'GET':
        cmd_line = "/usr/bin/rhosap-sosreport --batch"
        args = shlex.split(cmd_line)
        p = subprocess.Popen(args,
                             shell=False,
                             stdout=subprocess.PIPE,
                             stderr=subprocess.PIPE)
        out, err = p.communicate()
        rc = p.returncode
        response = http.HttpResponse(content_type='text/plain')
        response.write(out)
        response.flush()
        return response
    elif request.method == 'POST':
        response = http.HttpResponse(content_type='application/json')
        response.write("test")
        response.flush()
        return response
