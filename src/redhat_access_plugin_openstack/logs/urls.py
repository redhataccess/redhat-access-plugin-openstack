from django.conf.urls import patterns, url

from .views import IndexView, LogView

urlpatterns = patterns(
    '',
    url(r'^$', IndexView.as_view(), name='index'),
    url(r'^view$', LogView.as_view(), name='view'),
)
