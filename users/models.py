from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
from django.db import models

from tools.models import File


# Create your models here.
class User(AbstractUser):
    email = models.EmailField(unique=True)
    profile_picture = models.ForeignKey(File, on_delete=models.SET_NULL, null=True, blank=True)
    roles = models.ManyToManyField('Role', related_name='users', blank=True)

    def __str__(self):
        return self.username


class Role(models.Model):
    ADMIN_NAME = "Administrateur"

    name = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True)
    is_system = models.BooleanField(default=False)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name

    @classmethod
    def get_admin_role(cls):
        role, _ = Role.objects.get_or_create(
            name=cls.ADMIN_NAME,
            defaults={
                "description": "Rôle administrateur du forum.",
                "is_system": True,
            },
        )
        return role

    def clean(self):
        # Empêche qu'un rôle système perde son nom
        if self.pk:
            old = Role.objects.get(pk=self.pk)

            if old.is_system and old.name != self.name:
                raise ValidationError(
                    "Le nom d'un rôle système ne peut pas être modifié."
                )

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        if self.is_system:
            raise ValidationError(
                "Impossible de supprimer un rôle système."
            )

        super().delete(*args, **kwargs)