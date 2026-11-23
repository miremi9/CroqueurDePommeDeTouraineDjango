from django.db import models
from solo.models import SingletonModel


# Create your models here.
class SiteBody(SingletonModel):
    title = models.CharField(max_length=100)
    logo = models.ImageField(null=True, blank=True)
    logo2 = models.ImageField(null=True, blank=True)
    background_image = models.ImageField(null=True, blank=True)
    bas_de_page = models.TextField()

    color = models.CharField(max_length=7, default='#FFFFFF')  # Default color is white
    url = models.URLField(max_length=200, blank=True, null=True)

    def __str__(self):
        return self.title


class VisitorLog(models.Model):
    session_key = models.CharField(max_length=40, unique=True)
    first_seen = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.session_key} - {self.first_seen}"
