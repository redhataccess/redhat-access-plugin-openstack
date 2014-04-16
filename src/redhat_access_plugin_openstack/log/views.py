import logging

from django.utils.translation import ugettext_lazy as _
from django import http

import subprocess
import shlex

from horizon import exceptions
from horizon import tables
from horizon import views

from openstack_dashboard import api
from openstack_dashboard.dashboards.project.instances.tables \
    import InstancesTable
from openstack_dashboard.dashboards.project.instances.views \
    import IndexView as InstanceView
from openstack_dashboard.dashboards.project.instances.tables \
    import LogLink

LOG = logging.getLogger(__name__)


class LogViewLink(LogLink):
    url = "view"
    instance_id = None

    def allowed(self, request, instance=None):
        self.instance_id = instance.id
        return True

    def get_link_url(self, datum):
        base_url = super(LogLink, self).get_link_url(datum)
        return "?id=".join([base_url, self.instance_id])


class ListTable(InstancesTable):

    class Meta:
        name = "instances"
        verbose_name = "Instances"
        row_actions = (LogViewLink,)


class IndexView(InstanceView):
    table_class = ListTable
    template_name = 'redhat_access_plugin_openstack/log/index.html'


class LocalLogView(views.APIView):
    template_name = 'redhat_access_plugin_openstack/log/viewlocal.html'

    def get_data(self, request, *args, **kwargs):
        instance_id = request.GET.get('id', None)
        try:
            data = api.nova.server_console_output(request,
                                                  instance_id,
                                                  tail_length=150)
        except:
            data = _('Unable to get log for instance "%s".') % instance_id
            exceptions.handle(request, ignore=True)
        return {"console_log": data}


def logs(request):
    if request.method == 'GET':
        path = request.GET.get('path')
        LOG.debug("Path: %s" % path)
        if path:
            try:
                f = open(path, 'r')
            except:
                LOG.error("Could not open file: %s" % path)
                return http.HttpResponseServerError("Could not open file")
            response = http.HttpResponse(content_type='text/plain')
            response.write(f.read())
            response.flush()
            return response
        else:
            cmd_line = "find /var/log/ -group apache -type f"
            args = shlex.split(cmd_line)
            try:
                p = subprocess.Popen(args,
                                     shell=False,
                                     stdout=subprocess.PIPE,
                                     stderr=subprocess.PIPE)
                out, err = p.communicate()
                rc = p.returncode
                LOG.debug("Find output: %s" % out)
                LOG.debug("Find err: %s" % err)
                LOG.debug("Find rc: %s" % str(rc))
            except:
                LOG.error("Could not list files")
                return http.HttpResponseServerError("Could not list files")
            response = http.HttpResponse(content_type='text/plain')
            response.write(out.strip())
            response.flush()
            return response
    else:
        LOG.error("Unsupported Method")
        response = http.HttpResponse()
        response.status_code = 405
        return response


class LogView(views.APIView):
    template_name = 'redhat_access_plugin_openstack/log/view.html'

    def get_data(self, request, *args, **kwargs):
        instance_id = request.GET.get('id', None)
        try:
            data = api.nova.server_console_output(request,
                                                  instance_id,
                                                  tail_length=150)
        except:
            data = _('Unable to get log for instance "%s".') % instance_id
            exceptions.handle(request, ignore=True)
        return {"console_log": data}
