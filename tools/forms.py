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


class FormMixin(object):
    """
    Mixin to add forms to a model
    provide cancel_url and request from kwargs
    """

    def __init__(self, *args, **kwargs):
        self.cancel_url = kwargs.pop('cancel_url', None)
        self.request = kwargs.pop('request', None)
        super().__init__(*args, **kwargs)
        self.helper = FormHelper()
        self.helper.layout = Layout()
