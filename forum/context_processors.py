import tools.authorisations
from forum.models import Section
from main.models import SiteBody
from users.forms import CrispyAuthenticationForm


def forum_sections(request):
    user = request.user

    parents = (
        Section.objects
        .filter(parent_section__isnull=True)
        .prefetch_related("section_set")
    )
    parents = [
        section
        for section in parents
        if tools.authorisations.can_read(
            user,
            section,
        )
    ]
    return {
        "sections": parents
    }


def site_body(request):
    return {
        "site_body": SiteBody.get_solo()
    }


def login_form(request):
    return {
        "login_form": CrispyAuthenticationForm(
            request
        )
    }
