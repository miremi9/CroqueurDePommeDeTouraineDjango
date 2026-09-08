from django.contrib import messages
from django.contrib.auth.decorators import user_passes_test
from django.contrib.auth.mixins import UserPassesTestMixin
from django.db.models import Case, When, Value, IntegerField, QuerySet
from django.forms import Form
from django.http import HttpResponseForbidden
# Create your views here.
from django.shortcuts import render, get_object_or_404
from django.urls import reverse
from django.views.generic import DetailView, CreateView, UpdateView, DeleteView, TemplateView

import tools.authorisations
from forum.forms import ArticleForm
from forum.models import Section, Article


def get_section_posts(section_id: int) -> QuerySet[Article]:
    return (Article.objects
            .filter(section_id=section_id)
            .annotate(
        pin_order=Case(
            When(pinned_on_top=True, then=Value(0)),
            default=Value(1),
            output_field=IntegerField()
        )
    )
            .order_by("pin_order", "created_at")
            )


def build_section_context(section, user):
    posts = get_section_posts(section.pk)
    for post in posts:
        post.edit_form = ArticleForm(instance=post, prefix=f"article_{post.id}")
    return {
        "section": section,
        "posts": posts,
        "can_post": tools.authorisations.can_post(user, section),
        "article_form": ArticleForm(),
    }


class ArticleBaseView(UserPassesTestMixin):
    model = Article
    form_class = ArticleForm
    template_name = "forum/article_form.html"

    def get_section(self):
        if 'pk' in self.kwargs:  # Update
            return self.get_object().section
        # Create (on suppose que vous passez le slug de la section dans l'URL)
        return Section.objects.get(slug=self.kwargs['slug'])

    def test_func(self):
        section = self.get_section()
        return tools.authorisations.can_post(self.request.user, section)

    def get_success_url(self):
        messages.success(self.request, "Article crée avec succès.")
        return reverse('forum:section_detail', kwargs={'slug': self.object.section.slug})


class ArticleCreateView(ArticleBaseView, CreateView):
    def form_valid(self, form):
        # Associer l'article à la section et à l'auteur lors de la création
        form.instance.section = self.get_section()
        form.instance.author = self.request.user
        return super().form_valid(form)

    def form_invalid(self, form):
        context = build_section_context(self.get_section(), self.request.user)
        context["article_form"] = form
        context["open_modal_id"] = "createModal"
        return render(self.request, "forum/section.html", context)


class ArticleUpdateView(ArticleBaseView, UpdateView):
    pk_url_kwarg = "id"

    def get_form_kwargs(self):
        kwargs = super().get_form_kwargs()
        kwargs["prefix"] = f"article_{self.object.id}"
        return kwargs

    def get_success_url(self):
        messages.info(self.request, "Article modifié avec succès.")
        return reverse('forum:section_detail', kwargs={'slug': self.object.section.slug})

    def form_invalid(self, form):
        context = build_section_context(self.get_section(), self.request.user)
        for post in context["posts"]:
            if post.pk == self.object.pk:
                post.edit_form = form
                break
        context["open_modal_id"] = f"updateModal{self.object.id}"
        return render(self.request, "forum/section.html", context)


class ArticleDeleteView(ArticleBaseView, DeleteView):
    pk_url_kwarg = "id"
    http_method_names = ["post"]
    form_class = Form  # empty form: ArticleBaseView would otherwise use ArticleForm

    def get_success_url(self):
        messages.success(self.request, "Article supprimé avec succès.")
        return reverse('forum:section_detail', kwargs={'slug': self.kwargs['slug']})


class SectionDetailView(UserPassesTestMixin, DetailView):
    model = Section
    template_name = "forum/section.html"
    context_object_name = "section"  # Nom de la variable dans votre template
    slug_field = 'slug'
    slug_url_kwarg = 'slug'

    def test_func(self):
        section = self.get_object()
        return tools.authorisations.can_read(self.request.user, section)

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context.update(build_section_context(self.object, self.request.user))
        return context


class MainPage(TemplateView):
    template_name = "forum/section.html"

    def get_posts(self):
        return (
            Article.objects
            .filter(pinned_on_main_page=True)
            .order_by("-created_at")
        )

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)

        context["posts"] = self.get_posts()

        for post in context["posts"]:
            post.edit_form = ArticleForm(
                instance=post,
                prefix=f"article_{post.id}"
            )

        return context


@user_passes_test(tools.authorisations.is_admin)
def article_toggle_pin(request, id):
    if request.method != "POST":
        return HttpResponseForbidden()

    article = get_object_or_404(Article, pk=id)

    if request.user != article.author:
        return HttpResponseForbidden()

    article.pinned_on_top = not article.pinned_on_top
    article.save(update_fields=["pinned_on_top"])

    return render(
        request,
        "forum/article/_pin_button.html",
        {"post": article},
    )


@user_passes_test(tools.authorisations.is_admin)
def article_toggle_pin_main_page(request, id):
    if request.method != "POST":
        return HttpResponseForbidden()

    article = get_object_or_404(Article, pk=id)

    if request.user != article.author:
        return HttpResponseForbidden()

    article.pinned_on_main_page = not article.pinned_on_main_page
    article.save(update_fields=["pinned_on_main_page"])

    return render(
        request,
        "forum/article/_main_page_button.html",
        {"post": article},
    )


def custom_404(request, exception):
    return render(request, "404.html", status=404)
