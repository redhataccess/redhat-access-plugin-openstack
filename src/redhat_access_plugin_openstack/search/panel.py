from django.utils.translation import ugettext_lazy as _

import horizon

from openstack_dashboard.dashboards.redhat_access_plugin_openstack import dashboard


class Search(horizon.Panel):
    name = _("Search")
    slug = "search"


dashboard.Redhat_Access.register(Search)
