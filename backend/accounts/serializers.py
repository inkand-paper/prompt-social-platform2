from rest_framework import serializers
from .models import User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'display_name', 'bio', 
            'avatar_url', 'avatar_color', 'website_url', 'location',
            'reputation_score', 'prompt_count', 'follower_count', 'following_count',
            'is_verified', 'created_at'
        ]
        read_only_fields = ['id', 'reputation_score', 'prompt_count', 'follower_count', 'following_count', 'created_at']

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'display_name']

    def create(self, validated_data):
        user = User.objects.create_user(
            email=validated_data['email'],
            username=validated_data['username'],
            password=validated_data['password'],
            display_name=validated_data.get('display_name', validated_data['username'])
        )
        return user
