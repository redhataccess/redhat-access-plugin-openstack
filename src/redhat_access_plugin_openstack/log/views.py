from django.utils.translation import ugettext_lazy as _
from django import http

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
    response = http.HttpResponse(content_type='text/plain')
    response.write("test")
    response.flush()
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
