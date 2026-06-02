from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import (
    RegisterView, MeView, MePromptsView, PublicProfileView, UserPromptsView,
    FollowUserView, ForgotPasswordView, ResetPasswordView, AvatarUploadView,
    LogoutView, VerifyEmailView,
)

urlpatterns = [
    # Auth
    path('register/', RegisterView.as_view(), name='auth_register'),
    path('verify-email/', VerifyEmailView.as_view(), name='auth_verify_email'), # Block C #1
    path('login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('logout/', LogoutView.as_view(), name='auth_logout'),
    path('me/', MeView.as_view(), name='auth_me'),
    path('me/prompts/', MePromptsView.as_view(), name='auth_me_prompts'),
    path('me/avatar/', AvatarUploadView.as_view(), name='auth_avatar_upload'),
    path('forgot-password/', ForgotPasswordView.as_view(), name='auth_forgot_password'),
    path('reset-password/', ResetPasswordView.as_view(), name='auth_reset_password'),

    # User Profiles
    path('profiles/<str:username>/', PublicProfileView.as_view(), name='user_profile'),
    path('profiles/<str:username>/prompts/', UserPromptsView.as_view(), name='user_prompts'),
    path('profiles/<str:username>/follow/', FollowUserView.as_view(), name='user_follow'),
]
