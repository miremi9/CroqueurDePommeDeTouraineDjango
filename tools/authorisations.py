from django.contrib.auth.base_user import AbstractBaseUser
from django.contrib.auth.models import AnonymousUser
from django.http import HttpRequest

from forum.models import Section
from users.models import Role


def is_admin(request):
    if isinstance(request, HttpRequest):
        return request.user.roles.filter(name=Role.ADMIN_NAME).exists()
    elif isinstance(request, AbstractBaseUser):
        return request.roles.filter(name=Role.ADMIN_NAME).exists()
    else:
        raise ValueError("la valuer n'est pas un request HttpRequest ou un AbstractBaseUser")


def can_post(user: AbstractBaseUser | AnonymousUser, section: Section):
    if isinstance(user, AbstractBaseUser):
        return user.roles.filter(id__in=section.can_post.all()).exists()
    else:
        return section.can_post.filter(name=Role.VISITEUR_NAME).exists()


def can_read(user: AbstractBaseUser | AnonymousUser, section: Section):
    if isinstance(user, AbstractBaseUser):
        return user.roles.filter(id__in=section.can_read.all()).exists()
    else:
        return section.can_read.filter(name=Role.VISITEUR_NAME).exists()
