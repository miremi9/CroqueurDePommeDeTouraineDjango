from forum.models import Section
from main.models import SiteBody


def forum_sections(request):
    parents = (
        Section.objects
        .filter(parent_section__isnull=True)
        .prefetch_related("section_set")
    )

    return {
        "sections": parents
    }


def site_body(request):
    return {
        "site_body": SiteBody.get_solo()
    }
