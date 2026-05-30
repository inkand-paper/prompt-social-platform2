from django.urls import path
from .views import (
    ExploreFeedView, TrendingFeedView, PromptDetailView, CreatePromptView, 
    CopyEventView, TrendingTagsView, CategoriesView, TopPromptersView,
    RatingCreateUpdateView, CommentListCreateView, SearchView,
    BookmarkListCreateView, BookmarkDestroyView,
    NotificationListView, NotificationMarkReadView,
    CollectionListCreateView
)

urlpatterns = [
    # Search, Bookmarks, Notifications, Collections
    path('search/', SearchView.as_view(), name='prompt_search'),
    path('bookmarks/', BookmarkListCreateView.as_view(), name='bookmark_list'),
    path('bookmarks/<uuid:prompt_id>/', BookmarkDestroyView.as_view(), name='bookmark_detail'),
    path('notifications/', NotificationListView.as_view(), name='notification_list'),
    path('notifications/mark-read/', NotificationMarkReadView.as_view(), name='notification_mark_read'),
    path('collections/', CollectionListCreateView.as_view(), name='collection_list'),

    # Main feed
    path('explore/', ExploreFeedView.as_view(), name='prompt_feed_explore'),
    path('trending/', TrendingFeedView.as_view(), name='prompt_feed_trending'),
    
    # Discovery
    path('tags/trending/', TrendingTagsView.as_view(), name='trending_tags'),
    path('categories/', CategoriesView.as_view(), name='categories_list'),
    path('users/top/', TopPromptersView.as_view(), name='top_prompters'),
    
    # Prompt actions
    path('create/', CreatePromptView.as_view(), name='prompt_create'),
    path('<slug:slug>/', PromptDetailView.as_view(), name='prompt_detail'),
    path('<uuid:pk>/copy/', CopyEventView.as_view(), name='prompt_copy_event'),
    path('<uuid:pk>/rate/', RatingCreateUpdateView.as_view(), name='prompt_rate'),
    path('<uuid:pk>/comments/', CommentListCreateView.as_view(), name='prompt_comments'),
]
