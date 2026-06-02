from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.throttling import AnonRateThrottle
import os
import secrets
import hashlib
import io
import uuid
from datetime import timedelta
from django.utils import timezone
from django.core.files.storage import default_storage
from django.db.models import F
from django.db import transaction
from PIL import Image
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from .models import User, Follow
from .serializers import UserSerializer, RegisterSerializer
from prompts.models import Prompt, Notification
from prompts.serializers import PromptSerializer
from prompts.tasks import send_email_task, push_notification_task


class LoginRateThrottle(AnonRateThrottle):
    scope = 'login'

class RegisterRateThrottle(AnonRateThrottle):
    scope = 'register'

class PasswordResetRateThrottle(AnonRateThrottle):
    scope = 'password_reset'


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (permissions.AllowAny,)
    serializer_class = RegisterSerializer
    throttle_classes = [RegisterRateThrottle]

    def perform_create(self, serializer):
        raw_token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
        
        with transaction.atomic():
            user = serializer.save(
                email_verification_token=token_hash,
                email_verification_sent_at=timezone.now()
            )
        
        # Block D #3: Using Celery for async email
        frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:5173')
        verify_url = f"{frontend_url}/verify-email?token={raw_token}"
        
        send_email_task.delay(
            subject='Verify your PromptAtlas account',
            message=(
                f'Welcome to PromptAtlas, {user.display_name}!\n\n'
                f'Please verify your email address by clicking the link below:\n\n{verify_url}\n\n'
                'If you did not sign up for an account, you can safely ignore this email.'
            ),
            recipient_list=[user.email]
        )


class VerifyEmailView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [RegisterRateThrottle]

    def post(self, request):
        raw_token = request.data.get('token', '')
        if not raw_token:
            return Response({'error': 'Token is required'}, status=400)
            
        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
        try:
            user = User.objects.get(
                email_verification_token=token_hash,
                email_verified=False
            )
            user.email_verified = True
            user.is_verified = True
            user.email_verification_token = None
            user.save(update_fields=['email_verified', 'is_verified', 'email_verification_token'])
            return Response({'message': 'Email verified successfully! You can now log in.'})
        except User.DoesNotExist:
            return Response({'error': 'Invalid or expired verification link.'}, status=400)


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_object(self):
        return self.request.user


class MePromptsView(generics.ListAPIView):
    serializer_class = PromptSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        return Prompt.objects.filter(author=self.request.user).order_by('-published_at')


class PublicProfileView(generics.RetrieveAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = (permissions.AllowAny,)
    lookup_field = 'username'


class UserPromptsView(generics.ListAPIView):
    serializer_class = PromptSerializer
    permission_classes = (permissions.AllowAny,)

    def get_queryset(self):
        username = self.kwargs.get('username')
        return Prompt.objects.filter(
            author__username=username,
            visibility='public',
            is_removed=False
        ).order_by('-published_at')


class FollowUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, username):
        try:
            target_user = User.objects.get(username=username)
            if target_user == request.user:
                return Response(
                    {"error": "You cannot follow yourself"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            _, created = Follow.objects.get_or_create(
                follower=request.user,
                following=target_user
            )
            if not created:
                return Response({"following": True, "message": "Already following"})

            User.objects.filter(pk=target_user.pk).update(follower_count=F('follower_count') + 1)
            User.objects.filter(pk=request.user.pk).update(following_count=F('following_count') + 1)
            
            # Block E: Async notification (DB + WS)
            notif = Notification.objects.create(
                recipient=target_user,
                actor=request.user,
                type='new_follower',
                message=f"{request.user.display_name} started following you"
            )
            push_notification_task.delay(str(target_user.id), {
                "id": str(notif.id),
                "type": "new_follower",
                "message": notif.message,
                "actor": request.user.username
            })
            
            return Response({"following": True})
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

    def delete(self, request, username):
        try:
            target_user = User.objects.get(username=username)
            deleted, _ = Follow.objects.filter(
                follower=request.user,
                following=target_user
            ).delete()
            if deleted:
                User.objects.filter(pk=target_user.pk).update(
                    follower_count=F('follower_count') - 1
                )
                User.objects.filter(pk=request.user.pk).update(
                    following_count=F('following_count') - 1
                )
            return Response({"following": False})
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)


class ForgotPasswordView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [PasswordResetRateThrottle]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        try:
            user = User.objects.get(email=email)
            raw_token = secrets.token_urlsafe(32)
            token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
            user.password_reset_token = token_hash
            user.password_reset_expires = timezone.now() + timedelta(hours=1)
            user.save(update_fields=['password_reset_token', 'password_reset_expires'])

            frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:5173')
            reset_url = f"{frontend_url}/reset-password?token={raw_token}"

            # Block D #3: Async email
            send_email_task.delay(
                subject='Reset your PromptAtlas password',
                message=(
                    f'Click the link to reset your password:\n\n{reset_url}\n\n'
                    'This link expires in 1 hour.'
                ),
                recipient_list=[email]
            )
        except User.DoesNotExist:
            pass
        return Response({'message': 'If that email exists, a reset link was sent.'})


class ResetPasswordView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [PasswordResetRateThrottle]

    def post(self, request):
        raw_token = request.data.get('token', '')
        new_password = request.data.get('password', '')
        if len(new_password) < 8:
            return Response(
                {'error': 'Password must be at least 8 characters.'},
                status=400
            )

        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
        try:
            user = User.objects.get(
                password_reset_token=token_hash,
                password_reset_expires__gt=timezone.now()
            )
            user.set_password(new_password)
            user.password_reset_token = None
            user.password_reset_expires = None
            user.save()
            return Response({'message': 'Password reset successfully.'})
        except User.DoesNotExist:
            return Response({'error': 'Invalid or expired reset link.'}, status=400)


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response({'error': 'Refresh token required.'}, status=400)
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response(status=status.HTTP_205_RESET_CONTENT)
        except TokenError:
            return Response({'error': 'Invalid token.'}, status=400)


class AvatarUploadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        file = request.FILES.get('avatar')
        if not file:
            return Response({'error': 'No file provided.'}, status=400)

        if file.size > 5 * 1024 * 1024:
            return Response({'error': 'File too large. Max 5MB.'}, status=400)

        allowed = ['image/jpeg', 'image/png', 'image/webp']
        if file.content_type not in allowed:
            return Response({'error': 'Invalid file type.'}, status=400)

        try:
            img = Image.open(file)
            img = img.convert('RGB')
            img.thumbnail((400, 400))

            buffer = io.BytesIO()
            img.save(buffer, format='JPEG', quality=85)
            buffer.seek(0)

            filename = f'avatars/{request.user.id}/{uuid.uuid4()}.jpg'
            path = default_storage.save(filename, buffer)
            url = request.build_absolute_uri(default_storage.url(path))

            request.user.avatar_url = url
            request.user.save(update_fields=['avatar_url'])

            return Response({'avatar_url': url})
        except Exception as e:
            return Response({'error': str(e)}, status=500)
