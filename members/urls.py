from django.urls import path
from .views import BoardListCreate

urlpatterns = [
    # This endpoint will be: http://127.0.0.1:8000/api/boards/
    path('boards/', BoardListCreate.as_view(), name='board-list-create'),
]