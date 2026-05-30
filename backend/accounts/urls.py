from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import RegisterView, MeView, MePromptsView, PublicProfileView, UserPromptsView, FollowUserView

urlpatterns = [
    # Auth
    path('register/', RegisterView.as_view(), name='auth_register'),
    path('login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', MeView.as_view(), name='auth_me'),
    path('me/prompts/', MePromptsView.as_view(), name='auth_me_prompts'),
    
    # User Profiles
    path('profiles/<str:username>/', PublicProfileView.as_view(), name='user_profile'),
    path('profiles/<str:username>/prompts/', UserPromptsView.as_view(), name='user_prompts'),
    path('profiles/<str:username>/follow/', FollowUserView.as_view(), name='user_follow'),
]
