from horizon import views
import logging
import string
import getpass

from django import http
from django import shortcuts
from django.core.urlresolvers import reverse, reverse_lazy
from django.utils.datastructures import SortedDict
from django.utils.translation import ugettext_lazy as _
from django.views.decorators.csrf import csrf_exempt
from django.core.context_processors import csrf

from horizon import exceptions
from horizon import forms
from horizon import tables

from openstack_dashboard import api
from openstack_dashboard.dashboards.project.instances \
    import tables as tableFile
from openstack_dashboard.dashboards.project.instances.tables \
    import InstancesTable
from openstack_dashboard.dashboards.project.instances.views \
    import IndexView as InstanceView


class LogLink(tables.LinkAction):
    name = "log"
    verbose_name = _("View Log")
    url = "view"
    instance_id = None
    classes = ("btn-log",)

    def allowed(self, request, instance=None):
        print instance.id
        self.instance_id = instance.id
        return instance.status in tableFile.ACTIVE_STATES \
            and not tableFile.is_deleting(instance)

    def get_link_url(self, datum):
        base_url = super(LogLink, self).get_link_url(datum)
        return "?id=".join([base_url, self.instance_id])


class ListTable(InstancesTable):
    pass

    class Meta:
        name = "instances"
        verbose_name = "Instances"
        table_actions = (tableFile.InstancesFilterAction,)
        row_actions = (LogLink,)


class IndexView(InstanceView):
    table_class = ListTable
    template_name = 'redhat_access_plugin_openstack/log/index.html'


class LogView(views.APIView):
    template_name = 'redhat_access_plugin_openstack/log/view.html'

    def get_data(self, request, *args, **kwargs):
        instance_id = request.GET.get('id', None)
        print getpass.getuser()
        try:
            data = api.nova.server_console_output(request,
                                                  instance_id,
                                                  tail_length=150)
        except:
            data = _('Unable to get log for instance "%s".') % instance_id
            exceptions.handle(request, ignore=True)
        return {"console_log": data}
