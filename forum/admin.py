from django.contrib import admin

from forum.models import Section


# Register your models here.
@admin.register(Section)
class SectionAdmin(admin.ModelAdmin):
    pass