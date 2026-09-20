from django.urls import path

from .views import CategoryDetailView, CategoryListView, CategoryTreeView

app_name = "categories"

urlpatterns = [
    path("tree/", CategoryTreeView.as_view(), name="tree"),
    path("", CategoryListView.as_view(), name="list"),
    path("<slug:slug>/", CategoryDetailView.as_view(), name="detail"),
]
