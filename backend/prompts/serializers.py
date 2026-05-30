from rest_framework import serializers
from accounts.serializers import UserSerializer
from .models import (
    Prompt, Category, Tag, Rating, Comment, 
    Bookmark, Notification, Collection, CollectionItem
)

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'slug', 'name', 'emoji', 'color', 'prompt_count']

class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ['id', 'slug', 'name', 'usage_count']

class PromptSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)
    categories = CategorySerializer(many=True, read_only=True)
    tags = TagSerializer(many=True, read_only=True)
    
    class Meta:
        model = Prompt
        fields = [
            'id', 'slug', 'title', 'body', 'description', 'prompt_type', 
            'visibility', 'cover_image_url', 'target_model', 'variables',
            'fork_count', 'view_count', 'copy_count', 'save_count', 
            'comment_count', 'rating_count', 'average_rating',
            'author', 'categories', 'tags', 'is_featured', 'published_at'
        ]
        read_only_fields = ['id', 'slug', 'fork_count', 'view_count', 'copy_count', 'save_count', 'comment_count', 'rating_count', 'average_rating', 'author', 'published_at']

class CreatePromptSerializer(serializers.ModelSerializer):
    class Meta:
        model = Prompt
        fields = ['title', 'body', 'description', 'prompt_type', 'visibility', 'target_model', 'variables']

    def create(self, validated_data):
        user = self.context['request'].user
        prompt = Prompt.objects.create(author=user, **validated_data)
        return prompt

class RatingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rating
        fields = ['id', 'prompt', 'user', 'value', 'review_text', 'created_at']
        read_only_fields = ['id', 'user', 'created_at']

class CommentSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)
    
    class Meta:
        model = Comment
        fields = ['id', 'prompt', 'author', 'parent', 'body', 'like_count', 'created_at']
        read_only_fields = ['id', 'author', 'like_count', 'created_at']

class BookmarkSerializer(serializers.ModelSerializer):
    prompt_details = PromptSerializer(source='prompt', read_only=True)
    
    class Meta:
        model = Bookmark
        fields = ['id', 'user', 'prompt', 'prompt_details', 'created_at']
        read_only_fields = ['id', 'user', 'created_at']

class NotificationSerializer(serializers.ModelSerializer):
    actor_details = UserSerializer(source='actor', read_only=True)
    
    class Meta:
        model = Notification
        fields = [
            'id', 'recipient', 'actor', 'actor_details', 'type', 
            'prompt', 'comment', 'message', 'is_read', 'read_at', 'created_at'
        ]
        read_only_fields = ['id', 'recipient', 'read_at', 'created_at']

class CollectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Collection
        fields = ['id', 'owner', 'name', 'description', 'visibility', 'cover_image_url', 'prompt_count', 'created_at']
        read_only_fields = ['id', 'owner', 'prompt_count', 'created_at']

class CollectionItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = CollectionItem
        fields = ['id', 'collection', 'prompt', 'added_by', 'note', 'sort_order', 'added_at']
        read_only_fields = ['id', 'added_by', 'added_at']
