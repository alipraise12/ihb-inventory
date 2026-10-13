from rest_framework import serializers
from .models import Member, Board
from django.contrib.auth.models import User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']

class BoardSerializer(serializers.ModelSerializer):
    creator_name = serializers.ReadOnlyField(source='creator.username')

    class Meta:
        model = Board
        fields = ['id', 'name', 'creator', 'creator_name', 'entry_fee', 'is_full', 'created_at']