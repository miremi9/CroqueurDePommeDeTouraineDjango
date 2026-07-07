from django.db import models


# Create your models here.
class Article(models.Model):
    title = models.CharField(max_length=200)
    content = models.TextField()
    section = models.ForeignKey('Section', on_delete=models.CASCADE)
    author = models.ForeignKey('users.User', on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    pinned_on_top = models.BooleanField(default=False)
    pinned_on_main_page = models.BooleanField(default=False)
    suppressed = models.BooleanField(default=False)
    illustration = models.ForeignKey('Illustration', on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return self.title

class Section(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)

    def __str__(self):
        return self.name

class Illustration(models.Model):
    article = models.ForeignKey(Article, on_delete=models.CASCADE)
    image = models.ImageField(upload_to='illustrations/')
    caption = models.CharField(max_length=200, blank=True)

    def __str__(self):
        return f"Illustration for {self.article.title}"
