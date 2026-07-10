from django.db import models
from solo.models import SingletonModel

from tools.models import File


# Create your models here.
class SiteBody(SingletonModel):
    title = models.CharField(max_length=100)
    bas_de_page = models.TextField()
    logo = models.ForeignKey(File, on_delete=models.SET_NULL, null=True, blank=True)
    color = models.CharField(max_length=7, default='#FFFFFF')  # Default color is white
    url = models.URLField(max_length=200, blank=True, null=True)

    def __str__(self):
        return self.title