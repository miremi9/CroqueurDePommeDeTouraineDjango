from django.db import models

from tools.models import File
from users.models import Role, User


class Section(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    slug = models.SlugField(max_length=100, unique=True, blank=True)
    can_post = models.ManyToManyField(Role, related_name='can_post_sections', blank=True)
    can_read = models.ManyToManyField(Role, related_name='can_read_sections', blank=True)
    

    def __str__(self):
        return self.name


class Article(models.Model):
    title = models.CharField(max_length=200)
    content = models.TextField()
    section = models.ForeignKey(Section, on_delete=models.CASCADE)
    author = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    pinned_on_top = models.BooleanField(default=False)
    pinned_on_main_page = models.BooleanField(default=False)
    suppressed = models.BooleanField(default=False)
    illustrations = models.ManyToManyField(File, blank=True)

    def __str__(self):
        return self.title




