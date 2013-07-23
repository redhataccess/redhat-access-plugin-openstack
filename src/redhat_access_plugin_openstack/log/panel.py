from django.utils.translation import ugettext_lazy as _

import horizon

from redhat_access_plugin_openstack import dashboard


class Log(horizon.Panel):
    name = _("Log")
    slug = "log"


dashboard.Redhat_Access.register(Log)
