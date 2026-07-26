from typing import Callable
from typing import Type

import django_filters
from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.core.files.storage import default_storage
from django.db import models
from django.db.models import Q
from django.http import JsonResponse, HttpResponseRedirect
from django.http.request import HttpRequest
from django.views.decorators.csrf import csrf_exempt
from django.views.generic.detail import SingleObjectMixin
from django.views.generic.edit import FormView
from django_filters.views import FilterView

from tools.forms import SearchForm


class SimpleFilterSet(django_filters.FilterSet):
    class Meta:
        model = None
        fields = '__all__'  # On prend tout, et on nettoie après

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # On supprime automatiquement tous les filtres liés à des fichiers/images
        for field_name, filter_obj in list(self.filters.items()):
            field_type = type(self.queryset.model._meta.get_field(field_name))
            if issubclass(field_type, (models.FileField, models.ImageField)):
                del self.filters[field_name]


# Create your views here.
def listview_factory(my_model: Type[models.Model],
                     url_detail: str,
                     url_create: str | None,
                     function_test: Callable[[HttpRequest], bool] = lambda request: True,
                     order_by_attribut: str | None = None, ):
    """genere une vue de l'ensemble des elements
    Pour le filtre, le modele doit avoir l'attribut SEARCH_FIELD qui contient l'ensemble des champs

    """

    class MyListView(LoginRequiredMixin, UserPassesTestMixin, FilterView):
        model = my_model
        template_name = 'tools/listview.html'
        filterset_class = SimpleFilterSet
        context_object_name = 'items'

        def test_func(self):
            return function_test(self.request)

        def get_search_fields(self):
            return getattr(
                self.model,
                "SEARCH_FIELDS",
                ()
            )

        def get_queryset(self):
            queryset = super().get_queryset()

            search = self.request.GET.get("q", "").strip()
            search_fields = self.get_search_fields()

            if search and search_fields:
                search_query = Q()

                for field in search_fields:
                    search_query |= Q(
                        **{
                            f"{field}__icontains": search
                        }
                    )
                queryset = queryset.filter(search_query)
            if order_by_attribut:
                queryset = queryset.order_by(order_by_attribut)

            return queryset

        def get_context_data(self, **kwargs):
            context = super().get_context_data(**kwargs)
            context["url_detail"] = url_detail
            context["url_create"] = url_create
            context["search_form"] = SearchForm(self.request.GET)

            return context

    return MyListView


def formview_factory(my_model, name_field, form, cancel_url, my_success_url, can_access_function, instance=None, ):
    class ViewEdit(LoginRequiredMixin, UserPassesTestMixin, SingleObjectMixin, FormView):
        model = my_model
        form_class = form
        template_name = "tools/edit_form.html"

        def setup(self, request, *args, **kwargs):
            # Indispensable pour que SingleObjectMixin puisse chercher l'objet
            super().setup(request, *args, **kwargs)
            if "pk" in self.kwargs:
                self.object = self.get_object()
                return
            elif instance:
                self.object = instance()
            else:
                self.object = None

        def get_form_kwargs(self):
            kwargs = super().get_form_kwargs()
            # Si on a un objet, on le passe au formulaire pour qu'il soit pré-rempli
            kwargs["instance"] = self.object

            kwargs["request"] = self.request
            if self.request.method in ("POST", "PUT"):
                kwargs["files"] = self.request.FILES
            return kwargs

        def form_valid(self, form):
            # Le formulaire gère la création (si pas d'instance) ou la mise à jour (si instance)
            form.save()
            return HttpResponseRedirect(my_success_url)

        def test_func(self):
            return can_access_function(self.request)

        def get_context_data(self, **kwargs):
            context = super().get_context_data(**kwargs)
            context["object"] = self.object
            context["name"] = getattr(self.object, name_field, "Nouvel élément")
            context["cancel_url"] = cancel_url
            return context

    return ViewEdit


@csrf_exempt
def tinymce_upload(request):
    file = request.FILES["file"]

    path = default_storage.save(
        f"tinymce/{file.name}",
        file
    )

    url = default_storage.url(path)

    return JsonResponse({
        "location": url
    })
