from bs4 import BeautifulSoup
from crispy_forms.helper import FormHelper
from crispy_forms.layout import Layout
from django import forms
from tinymce.widgets import TinyMCE

from forum.models import Article


class ArticleForm(forms.ModelForm):
    class Meta:
        model = Article
        fields = ['title', 'content', 'file']
        widgets = {
            "content": TinyMCE(),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        self.helper = FormHelper()
        self.helper.form_tag = False
        self.helper.layout = Layout('title', 'content', 'file')

    def clean_content(self):
        content = self.cleaned_data["content"]

        soup = BeautifulSoup(content, "html.parser")

        for iframe in soup.find_all("iframe"):
            iframe.attrs.pop("sandbox", None)

        return str(soup)
