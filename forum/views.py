from django.http import HttpResponseForbidden

# Create your views here.
from django.shortcuts import get_object_or_404, render
from django.views import View

from forum.models import Section


def section_detail(request, slug):

    section = get_object_or_404(
        Section,
        slug=slug
    )

    user_roles = request.user.roles.all()

    can_read = section.can_read.filter(
        id__in=user_roles
    ).exists()

    if not can_read:
        return HttpResponseForbidden(
            "Vous n'avez pas accès à cette section"
        )

    return render(
        request,
        "forum/section.html",
        {
            "section": section
        }
    )

class main(View):
    def get(self, request):
        return render(request, "base.html")