from django.urls import path
from .views import (
    ExploreFeedView, TrendingFeedView, PromptDetailView, CreatePromptView, EditPromptView, PromptDestroyView,
    CopyEventView, TrendingTagsView, CategoriesView, TopPromptersView,
    RatingCreateUpdateView, CommentListCreateView, SearchView,
    BookmarkListCreateView, BookmarkDestroyView,
    NotificationListView, NotificationMarkReadView,
    CollectionListCreateView, CollectionItemView, CollectionDetailView,
    ForkPromptView, ReportView, ReportListView, ReportDetailView
)

urlpatterns = [
    # Moderation (Staff Only)
    path('admin/reports/', ReportListView.as_view(), name='report_list'),
    path('admin/reports/<uuid:pk>/', ReportDetailView.as_view(), name='report_detail'),

    # Search, Bookmarks, Notifications, Collections (Specific UUID paths first)
    path('search/', SearchView.as_view(), name='prompt_search'),
    path('bookmarks/', BookmarkListCreateView.as_view(), name='bookmark_list'),
    path('bookmarks/<uuid:prompt_id>/', BookmarkDestroyView.as_view(), name='bookmark_detail'),
    path('notifications/', NotificationListView.as_view(), name='notification_list'),
    path('notifications/mark-read/', NotificationMarkReadView.as_view(), name='notification_mark_read'),
    path('collections/', CollectionListCreateView.as_view(), name='collection_list'),
    path('collections/<uuid:collection_id>/', CollectionDetailView.as_view(), name='collection_detail'),
    path('collections/<uuid:collection_id>/items/', CollectionItemView.as_view(), name='collection_items'),

    # Actions using UUID (must come before slug route)
    path('<uuid:pk>/copy/', CopyEventView.as_view(), name='prompt_copy_event'),
    path('<uuid:pk>/rate/', RatingCreateUpdateView.as_view(), name='prompt_rate'),
    path('<uuid:pk>/comments/', CommentListCreateView.as_view(), name='prompt_comments'),
    path('<uuid:pk>/fork/', ForkPromptView.as_view(), name='prompt_fork'),
    path('<uuid:pk>/report/', ReportView.as_view(), name='prompt_report'),

    # Main feed
    path('explore/', ExploreFeedView.as_view(), name='prompt_feed_explore'),
    path('trending/', TrendingFeedView.as_view(), name='prompt_feed_trending'),
    
    # Discovery
    path('tags/trending/', TrendingTagsView.as_view(), name='trending_tags'),
    path('categories/', CategoriesView.as_view(), name='categories_list'),
    path('users/top/', TopPromptersView.as_view(), name='top_prompters'),
    
    # Prompt CRUD
    path('create/', CreatePromptView.as_view(), name='prompt_create'),
    path('<uuid:pk>/edit/', EditPromptView.as_view(), name='prompt_edit'),
    path('<uuid:pk>/', PromptDestroyView.as_view(), name='prompt_delete'),
    path('<slug:slug>/', PromptDetailView.as_view(), name='prompt_detail'),
]
