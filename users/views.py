from django.contrib.auth import login, logout, update_session_auth_hash
from django.contrib.auth.decorators import login_required
from django.contrib.auth.forms import AuthenticationForm, PasswordChangeForm
from django.contrib.auth.mixins import LoginRequiredMixin
from django.shortcuts import redirect, render
from django.urls import reverse_lazy
from django.views.generic import UpdateView

from users.forms import RegisterForm, ProfileForm
from users.models import User


# Create your views here.

def login_view(request):
    if request.method == "POST":
        form = AuthenticationForm(
            request,
            data=request.POST
        )

        if form.is_valid():
            user = form.get_user()
            login(request, user)

            return redirect("forum:index")

    else:
        form = AuthenticationForm()

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
def profile_view(request):
    user = request.user

    return render(
        request,
        "users/profile.html",
        {
            "profile_user": user,
        }
    )


class EditProfileView(LoginRequiredMixin, UpdateView):
    model = User
    form_class = ProfileForm
    template_name = "users/profile_edit.html"

    def get_object(self):
        return self.request.user

    def get_success_url(self):
        return reverse_lazy("users:profile")

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["profile_form"] = ProfileForm(
            instance=self.request.user
        )
        context["password_form"] = PasswordChangeForm(
            user=self.request.user
        )

        return context

    def post(self, request, *args, **kwargs):

        if "password_submit" in request.POST:

            password_form = PasswordChangeForm(
                user=request.user,
                data=request.POST
            )

            if password_form.is_valid():
                user = password_form.save()

                update_session_auth_hash(
                    request,
                    user
                )

                return self.redirect_to_success()

        return super().post(request, *args, **kwargs)
