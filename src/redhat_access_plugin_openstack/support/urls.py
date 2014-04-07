from django.conf.urls.defaults import patterns, url

from .views import IndexView, attachments


urlpatterns = patterns(
    '',
    url(r'^$', IndexView.as_view(), name='index'),
    url(r'^attachments$', attachments, name='attachments'),
)
