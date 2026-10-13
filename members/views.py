from django.shortcuts import render
from rest_framework import generics
from .models import Board
from .serializers import BoardSerializer

class BoardListCreate(generics.ListCreateAPIView):
    queryset = Board.objects.all()
    serializer_class = BoardSerializer

    def perform_create(self, serializer):
        # Automatically set the creator to the logged-in user
        serializer.save(creator=self.request.user)
# Create your views here.
