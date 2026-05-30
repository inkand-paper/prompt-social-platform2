from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, Follow, OAuthProvider

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('username', 'email', 'display_name', 'reputation_score', 'is_staff', 'is_banned', 'created_at')
    list_filter = ('is_staff', 'is_verified', 'is_banned')
    search_fields = ('username', 'email', 'display_name')
    ordering = ('-created_at',)
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Profile', {'fields': ('display_name', 'bio', 'avatar_url', 'avatar_color', 'website_url', 'location')}),
        ('Stats', {'fields': ('reputation_score', 'prompt_count', 'follower_count', 'following_count')}),
        ('Status', {'fields': ('is_verified', 'is_banned', 'ban_reason', 'banned_at')}),
    )
    add_fieldsets = (
        (None, {'classes': ('wide',), 'fields': ('email', 'username', 'display_name', 'password1', 'password2')}),
    )

@admin.register(Follow)
class FollowAdmin(admin.ModelAdmin):
    list_display = ('follower', 'following', 'created_at')
    search_fields = ('follower__username', 'following__username')
