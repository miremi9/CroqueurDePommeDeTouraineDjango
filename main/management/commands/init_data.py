from django.conf import settings
from django.core.management.base import BaseCommand

from main.models import SiteBody
from users.models import Role, User


class Command(BaseCommand):
    help = "Initialise les données de base du site"

    def handle(self, *args, **options):

        self.create_roles()
        self.create_sections()
        self.create_site()
        self.create_admin()

        self.stdout.write(
            self.style.SUCCESS(
                "Initialisation terminée"
            )
        )

    def create_admin(self):

        admin = User.objects.create_superuser(
            username=settings.ADMIN_USERNAME,
            email=settings.ADMIN_EMAIL,  # Assurez-vous d'avoir défini cet email dans settings
            password=settings.ADMIN_PASSWORD
        )

        # Récupération du rôle
        admin_role = Role.objects.get(name=Role.ADMIN_NAME)  # Adaptez selon votre méthode get_admin_role
        admin.roles.add(admin_role)
        return admin

    def create_roles(self):

        roles = [
            Role.ADMIN_NAME,
            Role.MEMBER_NAME,
            Role.MODO_NAME,
            Role.VISITEUR_NAME
        ]

        for name in roles:
            role, created = Role.objects.get_or_create(
                name=name,
                defaults={"is_system": True, }
            )

            if created:
                self.stdout.write(
                    f"Création du rôle : {name}"
                )

    def create_sections(self):
        pass

    def create_site(self):

        site, created = SiteBody.objects.get_or_create(
            id=1,
            defaults={
                "title": "Mon forum",
                "bas_de_page": "Bienvenue",
            }
        )

        if created:
            self.stdout.write(
                "Création de la configuration du site"
            )
