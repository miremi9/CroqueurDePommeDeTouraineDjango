from crispy_forms.helper import FormHelper
from crispy_forms.layout import Layout, Submit, Field, HTML
from django import forms


class SearchForm(forms.Form):
    q = forms.CharField(
        label='',
        required=False,
        widget=forms.TextInput(attrs={'placeholder': 'Rechercher...'})
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.helper = FormHelper()
        self.helper.form_method = 'GET'  # Important pour la recherche
        self.helper.form_class = 'form-inline'  # Style en ligne
        self.helper.layout = Layout(
            Field('q', wrapper_class='flex-grow-1'),
            Submit('submit', 'Rechercher', css_class='btn-primary')
        )


class BasicButtonMixin(object):
    """
    Fournis des methodes pour rajotuer des boutons aux formulaires crispy
    utilise les attributs cancel_url et success_url (les recupere automatiquement des kwargs)
    """

    def __init__(self, *args, **kwargs):
        self.cancel_url = kwargs.pop('cancel_url', None)
        self.success_url = kwargs.pop('success_url', None)

        super().__init__(*args, **kwargs, )

    def get_cancel_button(self):
        return HTML(
            f"""
                    <a
                        href="{self.cancel_url}"
                        class="btn btn-outline-secondary"
                    >
                        Annuler
                    </a>
                    """
        )

    def get_register_button(self):
        def get_register_button(self):
            """
            Retourne un bouton Enregistrer.
            """

            return Submit(
                "submit",
                "Enregistrer",
                css_class="btn btn-primary",
            )

    def get_buttons(self):
        """
        Retourne les boutons standards du formulaire.
        """

        buttons = [
            self.get_register_button(),
        ]

        cancel_button = self.get_cancel_button()

        if cancel_button:
            buttons.append(
                cancel_button
            )

        return buttons
