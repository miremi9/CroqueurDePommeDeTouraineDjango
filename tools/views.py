from typing import Callable, Type

import django_filters
from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.db import models
from django.http.request import HttpRequest
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
    class MyListView(LoginRequiredMixin, UserPassesTestMixin, FilterView):
        model = my_model
        template_name = 'tools/listview.html'
        filterset_class = SimpleFilterSet
        context_object_name = 'items'

        def test_func(self):
            return function_test(self.request)

        def get_queryset(self):
            queryset = super().get_queryset()
            # Gestion du filtre via la barre d'URL : ?q=recherche
            query = self.request.GET.get('q')
            if query:
                queryset = queryset.filter(name__icontains=query)
            if order_by_attribut:
                return queryset.order_by(order_by_attribut)

        def get_context_data(self, **kwargs):
            context = super().get_context_data(**kwargs)
            context["url_detail"] = url_detail
            context["url_create"] = url_create
            context["search_form"] = SearchForm(self.request.GET)

            return context

    return MyListView
