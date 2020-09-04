# https://github.com/rvinzent/django-dynamic-models/wiki/Field-Schema
from django.shortcuts import render
from django.http import HttpResponseRedirect,HttpResponse
from django.views.decorators.csrf import csrf_protect
from django.db import models
from dynamic_models.models import ModelSchema, FieldSchema
from django.urls import clear_url_caches
from importlib import import_module,reload
from django.contrib import admin
from django.conf import settings
from .models import Modelnames

# Create your views here.

def createModels(request):
    model_schema = ModelSchema.objects.create(name='Zodiac')

    field_schema = FieldSchema.objects.create(
        name='make',
        data_type='character',
        model_schema=model_schema,
        max_length=255,
        null=False,
        unique=False
    )

    models = Modelnames.objects.all()
    for model in models:
        reg_model = ModelSchema.objects.get(name=model.modelname).as_model()
        admin.site.register(reg_model)
    reload(import_module(settings.ROOT_URLCONF))
    clear_url_caches()
    return HttpResponse('Dynamic model created!!')
