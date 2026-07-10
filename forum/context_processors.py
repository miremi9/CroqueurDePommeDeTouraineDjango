from main.models import SiteBody

from .models import Section


def forum_sections(request):
    return {
        "sections": Section.objects.all()
    }
def site_body(request):
    return {
        "site_body": SiteBody.get_solo()
    }