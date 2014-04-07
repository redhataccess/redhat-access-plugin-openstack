from django import http
from horizon import views


class IndexView(views.APIView):
    template_name = 'redhat_access_plugin_openstack/support/index.html'

    def get_data(self, request, context, *args, **kwargs):
        return context


def attachments(request):
    response = http.HttpResponse(content_type='text/plain')
    response.write("test")
    response.flush()
    return response
