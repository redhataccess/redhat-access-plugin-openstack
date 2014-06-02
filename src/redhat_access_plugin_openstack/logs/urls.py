from django.conf.urls import patterns, url

from .views import IndexView, LogView, LocalLogView, logs

urlpatterns = patterns(
    '',
    url(r'^$', IndexView.as_view(), name='index'),
    url(r'^view$', LogView.as_view(), name='view'),
    url(r'^viewlocal$', LocalLogView.as_view(), name='viewlocal'),
    url(r'^logs$', logs, name='logs'),
)