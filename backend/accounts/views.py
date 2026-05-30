from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from .models import User, Follow
from .serializers import UserSerializer, RegisterSerializer
from prompts.models import Prompt
from prompts.serializers import PromptSerializer

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (permissions.AllowAny,)
    serializer_class = RegisterSerializer

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

from rest_framework.views import APIView

class UserPromptsView(generics.ListAPIView):
    serializer_class = PromptSerializer
    permission_classes = (permissions.AllowAny,)

    def get_queryset(self):
        username = self.kwargs.get('username')
        return Prompt.objects.filter(author__username=username, visibility='public', is_removed=False).order_by('-published_at')

class FollowUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, username):
        try:
            target_user = User.objects.get(username=username)
            if target_user == request.user:
                return Response({"error": "You cannot follow yourself"}, status=status.HTTP_400_BAD_REQUEST)
                
            follow, created = Follow.objects.get_or_create(follower=request.user, following=target_user)
            if not created:
                # Toggle unfollow
                follow.delete()
                # Update counters
                target_user.follower_count = max(0, target_user.follower_count - 1)
                request.user.following_count = max(0, request.user.following_count - 1)
                target_user.save()
                request.user.save()
                return Response({"following": False})
            
            target_user.follower_count += 1
            request.user.following_count += 1
            target_user.save()
            request.user.save()
            return Response({"following": True})
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
