from django.contrib.auth.models import AbstractUser
from django.contrib.auth.validators import UnicodeUsernameValidator
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils.deconstruct import deconstructible
from django.utils.translation import gettext_lazy as _


@deconstructible
class SpaceAllowedUsernameValidator(UnicodeUsernameValidator):
    regex = r"^[\w.@+\- ]+\Z"
    message = _(
        "Enter a valid username. This value may contain only letters, "
        "numbers, spaces, and @/./+/-/_ characters."
    )


# Create your models here.
class User(AbstractUser):
    username_validator = SpaceAllowedUsernameValidator()
    username = models.CharField(
        _("username"),
        max_length=150,
        unique=True,
        help_text=_(
            "Required. 150 characters or fewer. Letters, digits, spaces and @/./+/-/_ only."
        ),
        validators=[username_validator],
        error_messages={
            "unique": _("A user with that username already exists."),
        },
    )
    email = models.EmailField(unique=True)
    profile_picture = models.ImageField(upload_to='uploads/',
                                        null=True,
                                        blank=True)
    roles = models.ManyToManyField('Role', related_name='users', blank=True)

    def __str__(self):
        return self.username

    @property
    def is_admin(self):
        # On suppose que Role.ADMIN_NAME est une constante
        return self.roles.filter(name=Role.ADMIN_NAME).exists()


@receiver(post_save, sender=User)
def add_default_role(sender, instance, created, **kwargs):
    if created:
        # Récupère le rôle visiteur (assurez-vous qu'il existe !)
        visiteur_role, _ = Role.objects.get_or_create(name=Role.VISITEUR_NAME)
        instance.roles.add(visiteur_role)


class Role(models.Model):
    ADMIN_NAME = "Administrateur"
    MEMBER_NAME = "Membre"
    MODO_NAME = "Modérateur"
    VISITEUR_NAME = "Visiteur"

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
