from django.contrib.auth import login, logout
from django.contrib.auth.decorators import login_required
from django.core.exceptions import PermissionDenied
from django.shortcuts import redirect, render, get_object_or_404
from django.urls import reverse_lazy

from tools.authorisations import can_see_profile
from tools.views import formview_factory
from users.forms import RegisterForm, ProfileForm, CrispyAuthenticationForm
from users.models import User


# Create your views here.

def login_view(request):
    if request.method == "POST":
        form = CrispyAuthenticationForm(
            request,
            data=request.POST
        )

        if form.is_valid():
            user = form.get_user()
            login(request, user)

            return redirect("forum:index")

    else:
        form = CrispyAuthenticationForm()

    return render(
        request,
        "users/login.html",
        {
            "form": form
        }
    )


def register_view(request):
    if request.method == "POST":
        form = RegisterForm(request.POST)

        if form.is_valid():
            user = form.save()

            # Connexion automatique après inscription
            login(request, user)

            return redirect("forum:index")

    else:
        form = RegisterForm()

    return render(
        request,
        "users/register.html",
        {
            "form": form
        }
    )


def logout_view(request):
    logout(request)

    return redirect("forum:index")


@login_required
def profile_view(request, id=None):
    if id is None:
        user = request.user
    else:
        user = get_object_or_404(
            User,
            pk=id,
        )
    if not can_see_profile(request, user):
        raise PermissionDenied

    return render(
        request,
        "users/profile.html",
        {
            "profile_user": user,
        },
    )


EditProfileView = formview_factory(
    my_model=User,
    name_field="username",
    form=ProfileForm,
    cancel_url=reverse_lazy("users:profile"),
    my_success_url=reverse_lazy("users:profile"),
    can_access_function=lambda request: request.user.is_authenticated,
    need_request=True,
)
