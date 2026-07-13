from crispy_forms.helper import FormHelper
from crispy_forms.layout import Layout, Submit, Field
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
