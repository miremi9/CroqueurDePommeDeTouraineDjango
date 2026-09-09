from crispy_forms.helper import FormHelper
from crispy_forms.layout import Layout
from django import forms
from django.contrib.auth.forms import PasswordChangeForm, AuthenticationForm, SetPasswordForm
from django.contrib.auth.password_validation import validate_password
from django.utils.safestring import mark_safe

import tools.authorisations
from tools.forms import FormMixin
from .models import User

PASSWORD_HELP_TEXT = mark_safe(
    "Le mot de passe doit respecter les règles suivantes :"
    "<ul class='mb-0 ps-3'>"
    "<li>contenir au moins 8 caractères ;</li>"
    "<li>ne pas être trop similaire à vos informations personnelles "
    "(nom d'utilisateur, email, etc.) ;</li>"
    "<li>ne pas être un mot de passe trop courant ;</li>"
    "<li>ne pas être uniquement composé de chiffres.</li>"
    "</ul>"
)


class RegisterForm(forms.ModelForm):
    password1 = forms.CharField(
        label="Mot de passe",
        widget=forms.PasswordInput,
        help_text=PASSWORD_HELP_TEXT,
    )

    password2 = forms.CharField(
        label="Confirmation du mot de passe",
        widget=forms.PasswordInput
    )

    class Meta:
        model = User
        fields = [
            "username",
            "email",
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.helper = FormHelper()
        self.helper.form_tag = False
        self.helper.layout = Layout(
            "username",
            "email",
            "password1",
            "password2",
        )

    def clean_password1(self):
        password = self.cleaned_data.get("password1")

        if password:
            validate_password(password, self.instance)

        return password

    def clean(self):
        cleaned_data = super().clean()

        password1 = cleaned_data.get("password1")
        password2 = cleaned_data.get("password2")

        if password1 != password2:
            raise forms.ValidationError(
                "Les mots de passe ne correspondent pas."
            )

        return cleaned_data

    def save(self, commit=True):
        user = super().save(commit=False)

        user.set_password(
            self.cleaned_data["password1"]
        )

        if commit:
            user.save()

        return user


class ProfileForm(FormMixin, forms.ModelForm):
    new_password = forms.CharField(
        label="Nouveau mot de passe",
        required=False,
        widget=forms.PasswordInput,
        help_text=PASSWORD_HELP_TEXT,
    )

    class Meta:
        model = User
        fields = [
            "username",
            "email",
            "roles",
        ]

        widgets = {
            "roles": forms.CheckboxSelectMultiple(),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        fields = ["username", "email"]

        if self.instance == self.request.user:
            fields.append("new_password")

        if tools.authorisations.is_admin(self.request.user):
            fields.append("roles")

        self.helper = FormHelper()
        self.helper.form_tag = False
        self.helper.layout = Layout(*fields)

    def clean_new_password(self):
        password = self.cleaned_data.get("new_password")

        if password:
            validate_password(password, self.instance)

        return password

    def save(self, commit=True):
        user = super().save(commit=False)

        password = self.cleaned_data.get("new_password")

        if password:
            user.set_password(password)

        if commit:
            user.save()
            self.save_m2m()

        return user


class CrispyAuthenticationForm(AuthenticationForm):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.helper = FormHelper()
        self.helper.form_tag = False
        self.helper.layout = Layout(
            "username",
            "password",
        )


class ProfilePasswordForm(PasswordChangeForm):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["new_password1"].help_text = PASSWORD_HELP_TEXT


class SetPasswordFormFr(SetPasswordForm):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["new_password1"].help_text = PASSWORD_HELP_TEXT
