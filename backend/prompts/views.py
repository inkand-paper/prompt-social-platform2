from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db import models
from django.db.models import Count, Avg
from accounts.models import User
from accounts.serializers import UserSerializer
from .models import Prompt, Category, Tag, Rating, Comment, Bookmark, Notification, Collection
from .serializers import (
    PromptSerializer, CreatePromptSerializer, CategorySerializer, 
    TagSerializer, RatingSerializer, CommentSerializer,
    BookmarkSerializer, NotificationSerializer, CollectionSerializer
)

class ExploreFeedView(generics.ListAPIView):
    serializer_class = PromptSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        queryset = Prompt.objects.filter(visibility='public', is_removed=False).order_by('-published_at')
        prompt_type = self.request.query_params.get('type')
        if prompt_type and prompt_type != 'all':
            queryset = queryset.filter(prompt_type=prompt_type)
        category_slug = self.request.query_params.get('category')
        if category_slug:
            queryset = queryset.filter(categories__slug=category_slug)
        sort = self.request.query_params.get('sort')
        if sort == 'rating':
            queryset = queryset.order_by('-average_rating', '-published_at')
        return queryset

class TrendingFeedView(generics.ListAPIView):
    serializer_class = PromptSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return Prompt.objects.filter(visibility='public', is_removed=False).order_by('-average_rating', '-published_at')

class PromptDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Prompt.objects.filter(is_removed=False)
    serializer_class = PromptSerializer
    lookup_field = 'slug'
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        if self.request.user.is_authenticated:
            return Prompt.objects.filter(models.Q(visibility='public') | models.Q(author=self.request.user))
        return Prompt.objects.filter(visibility='public')

class CreatePromptView(generics.CreateAPIView):
    serializer_class = CreatePromptSerializer
    permission_classes = [permissions.IsAuthenticated]

class CopyEventView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, pk):
        try:
            prompt = Prompt.objects.get(pk=pk)
            prompt.copy_count += 1
            prompt.save()
            return Response({"status": "success", "new_count": prompt.copy_count})
        except Prompt.DoesNotExist:
            return Response({"error": "Prompt not found"}, status=status.HTTP_404_NOT_FOUND)

class RatingCreateUpdateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            prompt = Prompt.objects.get(pk=pk)
            rating, created = Rating.objects.update_or_create(
                user=request.user,
                prompt=prompt,
                defaults={'value': request.data.get('value')}
            )
            stats = Rating.objects.filter(prompt=prompt).aggregate(avg=Avg('value'), count=Count('id'))
            prompt.average_rating = stats['avg']
            prompt.rating_count = stats['count']
            prompt.save()
            return Response(RatingSerializer(rating).data, status=status.HTTP_201_CREATED)
        except Prompt.DoesNotExist:
            return Response({"error": "Prompt not found"}, status=status.HTTP_404_NOT_FOUND)

class CommentListCreateView(generics.ListCreateAPIView):
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        return Comment.objects.filter(prompt_id=self.kwargs['pk']).order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(author=self.request.user, prompt_id=self.kwargs['pk'])

class TrendingTagsView(generics.ListAPIView):
    queryset = Tag.objects.all().order_by('-usage_count')[:8]
    serializer_class = TagSerializer
    permission_classes = [permissions.AllowAny]

class CategoriesView(generics.ListAPIView):
    queryset = Category.objects.all().order_by('sort_order')
    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny]

class TopPromptersView(generics.ListAPIView):
    queryset = User.objects.all().order_by('-reputation_score')[:4]
    serializer_class = UserSerializer
    permission_classes = [permissions.AllowAny]

class SearchView(generics.ListAPIView):
    serializer_class = PromptSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        q = self.request.query_params.get('q', '')
        if not q:
            return Prompt.objects.none()
        queryset = Prompt.objects.filter(visibility='public', is_removed=False)
        queryset = queryset.filter(
            models.Q(title__icontains=q) | 
            models.Q(description__icontains=q) | 
            models.Q(body__icontains=q) |
            models.Q(tags__name__icontains=q)
        ).distinct()
        prompt_type = self.request.query_params.get('type')
        if prompt_type and prompt_type != 'all':
            queryset = queryset.filter(prompt_type=prompt_type)
        return queryset

class BookmarkListCreateView(generics.ListCreateAPIView):
    serializer_class = BookmarkSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Bookmark.objects.filter(user=self.request.user).order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class BookmarkDestroyView(generics.DestroyAPIView):
    queryset = Bookmark.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    def delete(self, request, prompt_id):
        Bookmark.objects.filter(user=request.user, prompt_id=prompt_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

class NotificationListView(generics.ListAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user).order_by('-created_at')

class NotificationMarkReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        ids = request.data.get('ids')
        if ids:
            Notification.objects.filter(recipient=request.user, id__in=ids).update(is_read=True)
        else:
            Notification.objects.filter(recipient=request.user).update(is_read=True)
        return Response({"status": "success"})

class CollectionListCreateView(generics.ListCreateAPIView):
    serializer_class = CollectionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Collection.objects.filter(owner=self.request.user).order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)
