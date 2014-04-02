from django.conf.urls.defaults import patterns, url

from .views import IndexView, LogView, LocalLogView

urlpatterns = patterns(
    '',
    url(r'^$', IndexView.as_view(), name='index'),
    url(r'^view$', LogView.as_view(), name='view'),
    url(r'^viewlocal$', LocalLogView.as_view(), name='viewlocal'),
)
