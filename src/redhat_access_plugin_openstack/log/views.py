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
from horizon import tabs
from horizon import tables

from openstack_dashboard import api
from .tabs import InstanceDetailTabs
from .tables import InstancesTable


class IndexView(tables.DataTableView):
    table_class = InstancesTable
    template_name = 'redhat_access_plugin_openstack/log/index.html'

    def has_more_data(self, table):
        return self._more

    def get_data(self):
        marker = self.request.GET.get(
            InstancesTable._meta.pagination_param,
            None)
        # Gather our instances
        try:
            instances, self._more = api.nova.server_list(
                self.request,
                search_opts={'marker': marker,
                             'paginate': True})
        except:
            self._more = False
            instances = []
            exceptions.handle(self.request,
                              _('Unable to retrieve instances.'))
        # Gather our flavors and correlate our instances to them
        if instances:
            try:
                flavors = api.nova.flavor_list(self.request)
            except:
                flavors = []
                exceptions.handle(self.request, ignore=True)

            full_flavors = SortedDict(
                [(str(flavor.id), flavor) for flavor in flavors])
            # Loop through instances to get flavor info.
            for instance in instances:
                try:
                    flavor_id = instance.flavor["id"]
                    if flavor_id in full_flavors:
                        instance.full_flavor = full_flavors[flavor_id]
                    else:
                        # If the flavor_id is not in full_flavors list,
                        # get it via nova api.
                        instance.full_flavor = api.nova.flavor_get(
                            self.request, flavor_id)
                except:
                    msg = _('Unable to retrieve instance size information.')
                    exceptions.handle(self.request, msg)
        return instances


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
