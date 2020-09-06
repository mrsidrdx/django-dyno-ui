from django.urls import path
from .views import createModels, base, addModelEntries, showObjectLists

urlpatterns = [
    path('baseApp/', base, name='base_app'),
    path('', createModels, name='create_models'),
    path('addModelEntries', addModelEntries, name='add_entries'),
    path('showObjectLists', showObjectLists, name='show_objects'),
]
