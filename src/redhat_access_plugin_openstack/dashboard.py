from django.utils.translation import ugettext_lazy as _

import horizon


class Redhat_Access(horizon.Dashboard):
    name = _("Red Hat")
    slug = "redhat_access_plugin_openstack"
    panels = ("search", "log")  # Add your panels here.
    default_panel = 'search'  # Specify the dashboard's default panel.


horizon.register(Redhat_Access)
