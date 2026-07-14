from ckeditor_uploader.fields import RichTextUploadingField
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver

from tools.models import File
from users.models import Role, User


class Section(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    slug = models.SlugField(max_length=100, unique=True)
    can_post = models.ManyToManyField(Role, related_name='can_post_sections', blank=True)
    can_read = models.ManyToManyField(Role, related_name='can_read_sections', blank=True)
    parent_section = models.ForeignKey('self', on_delete=models.CASCADE, blank=True, null=True)

    def clean(self):
        # Vérifie si on essaie d'assigner un parent à une section qui est déjà un enfant
        if self.parent_section and self.parent_section.parent_section is not None:
            raise ValidationError("Une sous-section ne peut pas avoir de parent.")

    def save(self, *args, **kwargs):
        # Appelle la validation manuellement avant la sauvegarde
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


@receiver(post_save, sender=Section)
def manage_section_roles(sender, instance: Section, created, **kwargs):
    admin_role, _ = Role.objects.get_or_create(name=Role.ADMIN_NAME)
    instance.can_post.add(admin_role)
    instance.can_read.add(admin_role)


class Article(models.Model):
    title = models.CharField(max_length=200)
    content = RichTextUploadingField()
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
