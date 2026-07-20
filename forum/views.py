from django.contrib.auth.decorators import user_passes_test
from django.contrib.auth.mixins import UserPassesTestMixin
from django.db.models import Case, When, Value, IntegerField, QuerySet
from django.http import HttpResponseForbidden
# Create your views here.
from django.shortcuts import render, get_object_or_404
from django.urls import reverse
from django.views.generic import DetailView, CreateView, UpdateView, TemplateView

import tools.authorisations
from forum.forms import ArticleForm
from forum.models import Section, Article


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
        return reverse('forum:section_detail', kwargs={'slug': self.object.section.slug})


class ArticleCreateView(ArticleBaseView, CreateView):
    def form_valid(self, form):
        # Associer l'article à la section et à l'auteur lors de la création
        form.instance.section = self.get_section()
        form.instance.author = self.request.user
        return super().form_valid(form)


class ArticleUpdateView(ArticleBaseView, UpdateView):
    pk_url_kwarg = "id"

    def get_form_kwargs(self):
        kwargs = super().get_form_kwargs()
        kwargs["prefix"] = f"article_{self.object.id}"
        return kwargs

    def get_success_url(self):
        # Redirige vers la page de la section du post
        return reverse('forum:section_detail', kwargs={'slug': self.object.section.slug})


class SectionDetailView(UserPassesTestMixin, DetailView):
    model = Section
    template_name = "forum/section.html"
    context_object_name = "section"  # Nom de la variable dans votre template
    slug_field = 'slug'
    slug_url_kwarg = 'slug'

    def test_func(self):
        section = self.get_object()
        return tools.authorisations.can_read(self.request.user, section)

    def get_posts(self, section_id: int) -> QuerySet[Article]:
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

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        section = self.object

        context['posts'] = self.get_posts(section.pk)
        for post in context['posts']:
            post.edit_form = ArticleForm(instance=post, prefix=f"article_{post.id}")
        context['can_post'] = tools.authorisations.can_post(self.request.user, section)
        context['article_form'] = ArticleForm()
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
