from crispy_forms.helper import FormHelper
from crispy_forms.layout import Layout
from django import forms
from django.contrib.auth.forms import PasswordChangeForm, AuthenticationForm
from django.contrib.auth.password_validation import validate_password

import tools.authorisations
from tools.forms import FormMixin
from .models import User


class RegisterForm(forms.ModelForm):
    password1 = forms.CharField(
        label="Mot de passe",
        widget=forms.PasswordInput,
        help_text=(
            "Le mot de passe doit contenir au moins 8 caractères, "
            "ne pas être trop similaire à vos informations personnelles, "
            "ne pas être un mot de passe courant et ne pas être uniquement numérique."
        ),
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
    class Meta:
        model = User
        fields = [
            "username",
            "email",
            'roles',
        ]
        widgets = {
            'roles': forms.CheckboxSelectMultiple(),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        fields = ["username", "email"]
        if tools.authorisations.is_admin(self.request.user):
            fields.append("roles")
        self.helper = FormHelper()
        self.helper.form_tag = False
        self.helper.layout = Layout(*fields)


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
    pass
