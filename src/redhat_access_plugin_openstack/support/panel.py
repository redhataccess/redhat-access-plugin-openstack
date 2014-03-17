from django.utils.translation import ugettext_lazy as _

import horizon

from openstack_dashboard.dashboards.redhat_access_plugin_openstack import dashboard


class Support(horizon.Panel):
    name = _("Support")
    slug = "support"


dashboard.Redhat_Access.register(Support)
