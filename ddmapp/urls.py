from django.urls import path
from .views import createModels

urlpatterns = [
    path('createModels/', createModels, name='create_models'),
]
