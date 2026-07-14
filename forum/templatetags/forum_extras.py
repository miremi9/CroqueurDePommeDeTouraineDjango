from django import template

register = template.Library()


@register.inclusion_tag('forum/includes/article_modal.html')
def render_article_modal(form, modal_id, title, action_url, submit_text):
    return {
        'form': form,
        'modal_id': modal_id,
        'title': title,
        'action_url': action_url,
        'submit_text': submit_text,
    }


@register.filter
def concat(value, arg):
    return f"{value}{arg}"
