# This is an auto-generated Django model module.
# You'll have to do the following manually to clean this up:
#   * Rearrange models' order
#   * Make sure each model has one field with primary_key=True
#   * Make sure each ForeignKey and OneToOneField has `on_delete` set to the desired behavior
#   * Remove `managed = False` lines if you wish to allow Django to create, modify, and delete the table
# Feel free to rename the models, but don't rename db_table values or field names.
from django.db import models


class Comuna(models.Model):
    comuna_id = models.IntegerField(primary_key=True)
    comuna_nombre = models.CharField(max_length=20, blank=True, null=True)
    comuna_provincia = models.ForeignKey('Provincia', models.DO_NOTHING, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'comuna'


class Provincia(models.Model):
    provincia_id = models.IntegerField(primary_key=True)
    provincia_nombre = models.CharField(max_length=23, blank=True, null=True)
    provincia_region = models.ForeignKey('Region', models.DO_NOTHING, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'provincia'


class Region(models.Model):
    region_id = models.IntegerField(primary_key=True)
    region_nombre = models.CharField(max_length=50, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'region'
