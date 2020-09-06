from django.contrib import admin
from dynamic_models.models import ModelSchema
from .models import Modelnames

# Register your models here.
models = Modelnames.objects.all()
for model in models:
    reg_model = ModelSchema.objects.get(name=model.modelname).as_model()
    admin.site.register(reg_model)
