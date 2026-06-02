import os
from openai import OpenAI
from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db import models, transaction
from django.db.models import Count, Avg, F, Q, ExpressionWrapper, FloatField
from django.utils import timezone
from datetime import timedelta
from accounts.models import User
from accounts.serializers import UserSerializer
from .models import (
    Prompt, Category, Tag, Rating, Comment,
    Bookmark, Notification, Collection, CollectionItem, Report
)
from .serializers import (
    PromptSerializer, CreatePromptSerializer, CategorySerializer,
    TagSerializer, RatingSerializer, CommentSerializer,
    BookmarkSerializer, NotificationSerializer, CollectionSerializer,
    CollectionItemSerializer, ReportSerializer,
)
from .tasks import push_notification_task


class IsStaffUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_staff

class ReportListView(generics.ListAPIView):
    queryset = Report.objects.all().select_related('reporter', 'prompt', 'comment').order_by('-created_at')
    serializer_class = ReportSerializer
    permission_classes = [IsStaffUser]

class ReportDetailView(generics.RetrieveUpdateAPIView):
    queryset = Report.objects.all()
    serializer_class = ReportSerializer
    permission_classes = [IsStaffUser]

    def perform_update(self, serializer):
        serializer.save(reviewed_by=self.request.user, reviewed_at=timezone.now())


class ExploreFeedView(generics.ListAPIView):
    serializer_class = PromptSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        queryset = (
            Prompt.objects
            .filter(visibility='public', is_removed=False)
            .select_related('author')
            .prefetch_related('categories', 'tags')
            .order_by('-published_at')
        )
        prompt_type = self.request.query_params.get('type')
        if prompt_type and prompt_type not in ('all', ''):
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
        period = self.request.query_params.get('period', '7d')
        days = {'24h': 1, '7d': 7, '30d': 30}.get(period, 7)
        cutoff = timezone.now() - timedelta(days=days)
        return (
            Prompt.objects
            .filter(visibility='public', is_removed=False, published_at__gte=cutoff)
            .select_related('author')
            .prefetch_related('categories', 'tags')
            .annotate(
                trend_score=ExpressionWrapper(
                    (F('copy_count') * 3) +
                    (F('rating_count') * 2) +
                    F('comment_count'),
                    output_field=FloatField()
                )
            )
            .order_by('-trend_score', '-published_at')
        )


class PromptDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = PromptSerializer
    lookup_field = 'slug'
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        base = Prompt.objects.filter(is_removed=False).select_related('author').prefetch_related('categories', 'tags')
        if self.request.user.is_authenticated:
            return base.filter(Q(visibility='public') | Q(author=self.request.user))
        return base.filter(visibility='public')


class CreatePromptView(generics.CreateAPIView):
    serializer_class = CreatePromptSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        title = serializer.validated_data.get('title', '')
        body = serializer.validated_data.get('body', '')
        desc = serializer.validated_data.get('description', '')
        full_text = f"{title}\n{body}\n{desc}"

        api_key = os.environ.get('OPENAI_API_KEY')
        if api_key:
            try:
                client = OpenAI(api_key=api_key)
                response = client.moderations.create(input=full_text)
                if response.results[0].flagged:
                    from rest_framework.exceptions import ValidationError
                    raise ValidationError(
                        "Your prompt was flagged by our safety system. "
                        "Please review the community guidelines."
                    )
            except Exception as e:
                print(f"Moderation API error: {e}")

        serializer.save(author=self.request.user)


class EditPromptView(generics.UpdateAPIView):
    serializer_class = CreatePromptSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'pk'

    def get_queryset(self):
        return Prompt.objects.filter(author=self.request.user, is_removed=False)


class PromptDestroyView(generics.DestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'pk'

    def get_queryset(self):
        return Prompt.objects.filter(author=self.request.user)


class ForkPromptView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            original = Prompt.objects.get(pk=pk, visibility='public', is_removed=False)
        except Prompt.DoesNotExist:
            return Response({"error": "Prompt not found"}, status=status.HTTP_404_NOT_FOUND)

        if original.author == request.user:
            return Response({"error": "You cannot fork your own prompt"}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            fork = Prompt.objects.create(
                author=request.user,
                title=f"{original.title} (forked)",
                body=original.body,
                description=original.description,
                prompt_type=original.prompt_type,
                visibility='public',
                target_model=original.target_model,
                variables=original.variables,
                forked_from=original,
            )
            fork.categories.set(original.categories.all())
            fork.tags.set(original.tags.all())
            Prompt.objects.filter(pk=original.pk).update(fork_count=F('fork_count') + 1)

            notif = Notification.objects.create(
                recipient=original.author,
                actor=request.user,
                type='prompt_forked',
                prompt=original,
                message=f"{request.user.display_name} forked your prompt \"{original.title}\"",
            )
            push_notification_task.delay(str(original.author.id), {
                "id": str(notif.id),
                "type": "prompt_forked",
                "message": notif.message,
                "actor": request.user.username
            })

        return Response(PromptSerializer(fork, context={'request': request}).data, status=status.HTTP_201_CREATED)


class CopyEventView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, pk):
        try:
            Prompt.objects.filter(pk=pk).update(copy_count=F('copy_count') + 1)
            prompt = Prompt.objects.get(pk=pk)
            return Response({"status": "success", "new_count": prompt.copy_count})
        except Prompt.DoesNotExist:
            return Response({"error": "Prompt not found"}, status=status.HTTP_404_NOT_FOUND)


class RatingCreateUpdateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            prompt = Prompt.objects.get(pk=pk)
        except Prompt.DoesNotExist:
            return Response({"error": "Prompt not found"}, status=status.HTTP_404_NOT_FOUND)

        value = request.data.get('value')
        try:
            value = float(value)
            if not (0.5 <= value <= 5.0):
                raise ValueError
        except (TypeError, ValueError):
            return Response(
                {"error": "Rating must be between 0.5 and 5.0"},
                status=status.HTTP_400_BAD_REQUEST
            )

        rating, _ = Rating.objects.update_or_create(
            user=request.user, prompt=prompt, defaults={'value': value}
        )
        stats = Rating.objects.filter(prompt=prompt).aggregate(avg=Avg('value'), count=Count('id'))
        Prompt.objects.filter(pk=pk).update(
            average_rating=stats['avg'],
            rating_count=stats['count']
        )
        # Notify if new (simplified)
        if prompt.author != request.user:
             notif = Notification.objects.create(
                recipient=prompt.author,
                actor=request.user,
                type='new_rating',
                prompt=prompt,
                message=f"{request.user.display_name} rated your prompt \"{prompt.title}\" {value}/5"
            )
             push_notification_task.delay(str(prompt.author.id), {
                "id": str(notif.id),
                "type": "new_rating",
                "message": notif.message,
                "actor": request.user.username
            })

        return Response(RatingSerializer(rating).data, status=status.HTTP_201_CREATED)


class CommentListCreateView(generics.ListCreateAPIView):
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        return Comment.objects.filter(
            prompt_id=self.kwargs['pk'], is_removed=False
        ).select_related('author').order_by('-created_at')

    def perform_create(self, serializer):
        comment = serializer.save(author=self.request.user, prompt_id=self.kwargs['pk'])
        Prompt.objects.filter(pk=self.kwargs['pk']).update(
            comment_count=F('comment_count') + 1
        )
        prompt = Prompt.objects.get(pk=self.kwargs['pk'])
        if prompt.author != self.request.user:
            notif = Notification.objects.create(
                recipient=prompt.author,
                actor=self.request.user,
                type='new_comment',
                prompt=prompt,
                comment=comment,
                message=f"{self.request.user.display_name} commented on \"{prompt.title}\"",
            )
            push_notification_task.delay(str(prompt.author.id), {
                "id": str(notif.id),
                "type": "new_comment",
                "message": notif.message,
                "actor": request.user.username
            })
        return comment


class TrendingTagsView(generics.ListAPIView):
    queryset = Tag.objects.all().order_by('-usage_count')[:8]
    serializer_class = TagSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None


class CategoriesView(generics.ListAPIView):
    queryset = Category.objects.all().order_by('sort_order')
    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None


class TopPromptersView(generics.ListAPIView):
    queryset = User.objects.all().order_by('-reputation_score')[:4]
    serializer_class = UserSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None


class SearchView(generics.ListAPIView):
    serializer_class = PromptSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        q = self.request.query_params.get('q', '')
        if not q:
            return Prompt.objects.none()
        queryset = (
            Prompt.objects
            .filter(visibility='public', is_removed=False)
            .select_related('author')
            .prefetch_related('categories', 'tags')
            .filter(
                Q(title__icontains=q) |
                Q(description__icontains=q) |
                Q(body__icontains=q) |
                Q(tags__name__icontains=q)
            )
            .distinct()
        )
        prompt_type = self.request.query_params.get('type')
        if prompt_type and prompt_type != 'all':
            queryset = queryset.filter(prompt_type=prompt_type)
        return queryset


class BookmarkListCreateView(generics.ListCreateAPIView):
    serializer_class = BookmarkSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Bookmark.objects.filter(
            user=self.request.user
        ).select_related('prompt', 'prompt__author').order_by('-created_at')

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
        return Notification.objects.filter(
            recipient=self.request.user
        ).select_related('actor', 'prompt').order_by('-created_at')


class NotificationMarkReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        ids = request.data.get('ids')
        qs = Notification.objects.filter(recipient=request.user)
        if ids:
            qs = qs.filter(id__in=ids)
        qs.update(is_read=True, read_at=timezone.now())
        return Response({"status": "success"})


# Collections —————————————————————————————————————————————————————
class CollectionListCreateView(generics.ListCreateAPIView):
    serializer_class = CollectionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Collection.objects.filter(owner=self.request.user).order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class CollectionItemView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def _get_collection(self, collection_id, user):
        try:
            return Collection.objects.get(id=collection_id, owner=user)
        except Collection.DoesNotExist:
            return None

    def post(self, request, collection_id):
        collection = self._get_collection(collection_id, request.user)
        if not collection:
            return Response({"error": "Collection not found"}, status=status.HTTP_404_NOT_FOUND)

        prompt_id = request.data.get('prompt_id')
        try:
            prompt = Prompt.objects.get(pk=prompt_id)
        except (Prompt.DoesNotExist, ValueError):
            return Response({"error": "Prompt not found"}, status=status.HTTP_404_NOT_FOUND)

        item, created = CollectionItem.objects.get_or_create(
            collection=collection,
            prompt=prompt,
            defaults={
                'added_by': request.user,
                'sort_order': collection.prompt_count,
                'note': request.data.get('note', ''),
            }
        )
        if not created:
            return Response({"error": "Prompt already in collection"}, status=status.HTTP_409_CONFLICT)

        Collection.objects.filter(pk=collection_id).update(prompt_count=F('prompt_count') + 1)
        return Response(CollectionItemSerializer(item).data, status=status.HTTP_201_CREATED)

    def delete(self, request, collection_id):
        collection = self._get_collection(collection_id, request.user)
        if not collection:
            return Response({"error": "Collection not found"}, status=status.HTTP_404_NOT_FOUND)

        prompt_id = request.data.get('prompt_id')
        deleted, _ = CollectionItem.objects.filter(
            collection=collection, prompt_id=prompt_id
        ).delete()
        if deleted:
            Collection.objects.filter(pk=collection_id).update(
                prompt_count=F('prompt_count') - 1
            )
        return Response(status=status.HTTP_204_NO_CONTENT)

    def patch(self, request, collection_id):
        collection = self._get_collection(collection_id, request.user)
        if not collection:
            return Response({"error": "Collection not found"}, status=status.HTTP_404_NOT_FOUND)

        prompt_id = request.data.get('prompt_id')
        new_order = request.data.get('sort_order')
        try:
            new_order = int(new_order)
        except (TypeError, ValueError):
            return Response({"error": "sort_order must be an integer"}, status=400)

        updated = CollectionItem.objects.filter(
            collection=collection, prompt_id=prompt_id
        ).update(sort_order=new_order)
        if not updated:
            return Response({"error": "Item not found in collection"}, status=status.HTTP_404_NOT_FOUND)
        return Response({"status": "reordered"})


class CollectionDetailView(generics.ListAPIView):
    serializer_class = PromptSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        collection_id = self.kwargs['collection_id']
        return (
            Prompt.objects
            .filter(collections__id=collection_id)
            .select_related('author')
            .prefetch_related('categories', 'tags')
            .order_by('collectionitem__sort_order')
        )


class ReportView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            prompt = Prompt.objects.get(pk=pk)
        except Prompt.DoesNotExist:
            return Response({"error": "Prompt not found"}, status=status.HTTP_404_NOT_FOUND)

        reason = request.data.get('reason', '')
        if reason not in dict(Report.REASON_CHOICES):
            return Response(
                {"error": f"reason must be one of: {list(dict(Report.REASON_CHOICES).keys())}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        report, created = Report.objects.get_or_create(
            reporter=request.user,
            prompt=prompt,
            defaults={
                'reason': reason,
                'description': request.data.get('description', ''),
            }
        )
        if not created:
            return Response({"error": "You have already reported this prompt"}, status=status.HTTP_409_CONFLICT)

        return Response(ReportSerializer(report).data, status=status.HTTP_201_CREATED)
