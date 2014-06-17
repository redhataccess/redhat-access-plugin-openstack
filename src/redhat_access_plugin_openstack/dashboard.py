from django.utils.translation import ugettext_lazy as _

import horizon

class ActionPanels(horizon.PanelGroup):
    slug = "redhat_access_plugin_openstack"
    name = _("Red Hat Access")
    panels = ('search', 'logs', 'support')


class Redhat_Access(horizon.Dashboard):
    name = _("Red Hat Access")
    slug = "redhat_access_plugin_openstack"
    panels = (ActionPanels,)
    default_panel = 'search'
    nav = False

horizon.register(Redhat_Access)
