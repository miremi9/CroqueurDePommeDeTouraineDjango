from crispy_forms.helper import FormHelper
from crispy_forms.layout import Layout, Field, Column, Row
from django import forms

from forum.models import Section
from main.models import SiteBody
from tools.forms import BasicButtonMixin
from users.models import Role


class SectionForm(BasicButtonMixin, forms.ModelForm):
    class Meta:
        model = Section
        fields = ['name', 'description', 'slug', 'can_post', 'can_read', 'parent_section']
        widgets = {
            'can_post': forms.CheckboxSelectMultiple(),
            'can_read': forms.CheckboxSelectMultiple(),
            'description': forms.Textarea(attrs={'cols': 80, 'rows': 2}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        instance = self.instance
        if instance:
            self.fields['parent_section'].queryset = Section.objects.filter(
                parent_section__isnull=True
            ).exclude(pk=instance.pk)
        else:
            # Si c'est une création (pas d'instance), on prend toutes les racines
            self.fields['parent_section'].queryset = Section.objects.filter(
                parent_section__isnull=True
            )

        self.helper = FormHelper()
        self.helper.form_method = 'post'
        self.helper.form_tag = False
        self.helper.layout = Layout(Column(
            Row('name'),
            Row('description'),
            Row('slug'),
            Row('parent_section'),
            Row(Column('can_post'), Column('can_read'))
        )
        )

        if not instance.pk:
            admin_role = Role.objects.get(name=Role.ADMIN_NAME)
            self.fields['can_post'].initial = [admin_role.pk]
            self.fields['can_read'].initial = [admin_role.pk]

        # Optionnel : si vous voulez forcer un rendu propre des ManyToMany
        self.fields['can_post'].help_text = "Sélectionnez les rôles autorisés à publier."
        self.fields['can_read'].help_text = "Sélectionnez les rôles autorisés à lire."

    def clean_slug(self):
        slug = self.cleaned_data["slug"]
        return slug.lower()

    def clean(self):
        cleaned_data = super().clean()
        parent = cleaned_data.get("parent_section")
        can_read = cleaned_data.get('can_read')
        if parent and parent.parent_section is not None:
            raise forms.ValidationError("Une sous-section ne peut pas être parente d'une autre section.")
        if parent is self.instance:
            raise forms.ValidationError("Une section ne peut pas etre sa propre sous-section.")
        if not can_read.filter(name=Role.ADMIN_NAME).exists():
            raise forms.ValidationError(
                {"can_read": "Les administrateurs doivent obligatoirement avoir accès en lecture."})
        return cleaned_data


class SiteBodyForm(forms.ModelForm):
    class Meta:
        model = SiteBody
        fields = [
            "title",
            "background_image",
            "bas_de_page",
            "logo"
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.helper = FormHelper()
        self.helper.form_method = "post"
        self.helper.form_tag = False
        self.helper.layout = Layout(
            Field("title"),
            Field("background_image"),
            Field("logo"),
            Field("bas_de_page"),
        )


class RoleForm(forms.ModelForm):
    class Meta:
        model = Role
        fields = ['name', 'description']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.helper = FormHelper()
        self.helper.form_tag = False
        self.helper.layout = Layout(
            Field("name"),
            Field("description"),
            # Submit(
            #     "submit",
            #     "Enregistrer",
            #     css_class="btn btn-primary"
            # )
        )
