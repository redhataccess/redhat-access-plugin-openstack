from horizon import views


class IndexView(views.APIView):
    template_name = 'redhat_access_plugin_openstack/search/index.html'

    def get_data(self, request, context, *args, **kwargs):
        return context
