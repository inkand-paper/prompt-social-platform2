from django.contrib import admin
from django.utils import timezone
from .models import Prompt, Category, Tag, Rating, Comment, Collection, Bookmark, Notification, Report

@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ('reporter', 'prompt', 'comment', 'reason', 'status', 'created_at')
    list_filter = ('status', 'reason')
    search_fields = ('reporter__username', 'description')
    actions = ['dismiss_reports', 'action_reports']

    def dismiss_reports(self, request, queryset):
        queryset.update(status='dismissed', reviewed_by=request.user, reviewed_at=timezone.now())
    dismiss_reports.short_description = 'Dismiss selected reports'

    def action_reports(self, request, queryset):
        queryset.update(status='actioned', reviewed_by=request.user, reviewed_at=timezone.now())
    action_reports.short_description = 'Action selected reports'

@admin.register(Prompt)
class PromptAdmin(admin.ModelAdmin):
    list_display = ('title', 'author', 'prompt_type', 'visibility', 'average_rating', 'rating_count', 'copy_count', 'is_featured', 'is_removed', 'published_at')
    list_filter = ('prompt_type', 'visibility', 'is_featured', 'is_removed', 'is_flagged')
    search_fields = ('title', 'body', 'author__username')
    ordering = ('-published_at',)
    actions = ['mark_featured', 'mark_removed']

    def mark_featured(self, request, queryset):
        from django.utils import timezone
        queryset.update(is_featured=True, featured_at=timezone.now())
    mark_featured.short_description = 'Mark selected prompts as featured'

    def mark_removed(self, request, queryset):
        queryset.update(is_removed=True)
    mark_removed.short_description = 'Remove selected prompts'

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'emoji', 'prompt_count', 'sort_order')
    prepopulated_fields = {'slug': ('name',)}

@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'usage_count')
    search_fields = ('name',)

@admin.register(Rating)
class RatingAdmin(admin.ModelAdmin):
    list_display = ('prompt', 'user', 'value', 'created_at')
    list_filter = ('value',)

@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ('author', 'prompt', 'body', 'is_removed', 'created_at')
    list_filter = ('is_removed',)
    actions = ['remove_comments']

    def remove_comments(self, request, queryset):
        queryset.update(is_removed=True)
    remove_comments.short_description = 'Remove selected comments'

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('recipient', 'type', 'actor', 'is_read', 'created_at')
    list_filter = ('type', 'is_read')
