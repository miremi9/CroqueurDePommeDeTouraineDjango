from crispy_forms.helper import FormHelper
from crispy_forms.layout import Layout, Field
from django import forms

from forum.models import Article


class ArticleForm(forms.ModelForm):
    class Meta:
        model = Article
        fields = ['title', 'content']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        self.helper = FormHelper()
        self.helper.form_tag = False
        self.helper.layout = Layout(
            Field(
                'title',
                wrapper_class='mb-3'
            ),
            Field(
                'content',
                wrapper_class='mb-3'
            )
        )
