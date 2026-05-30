import uuid
from django.db import models
from django.conf import settings
from django.utils.text import slugify
from django.core.validators import MinValueValidator, MaxValueValidator

class Category(models.Model):
    slug = models.SlugField(max_length=60, unique=True)
    name = models.CharField(max_length=80)
    description = models.TextField(blank=True, null=True)
    emoji = models.CharField(max_length=8, blank=True, null=True)
    color = models.CharField(max_length=7, blank=True, null=True)
    sort_order = models.IntegerField(default=0)
    prompt_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class Tag(models.Model):
    slug = models.SlugField(max_length=60, unique=True)
    name = models.CharField(max_length=60)
    usage_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class Prompt(models.Model):
    TYPE_CHOICES = [
        ('text', 'Text'),
        ('image', 'Image'),
        ('video', 'Video'),
        ('audio', 'Audio'),
        ('code', 'Code'),
    ]
    VISIBILITY_CHOICES = [
        ('public', 'Public'),
        ('unlisted', 'Unlisted'),
        ('private', 'Private'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='prompts')
    slug = models.SlugField(max_length=120, unique=True)
    title = models.CharField(max_length=200)
    body = models.TextField()
    description = models.TextField(blank=True, null=True)
    prompt_type = models.CharField(max_length=10, choices=TYPE_CHOICES, default='text')
    visibility = models.CharField(max_length=10, choices=VISIBILITY_CHOICES, default='public')
    
    cover_image_url = models.URLField(blank=True, null=True)
    cover_image_key = models.CharField(max_length=255, blank=True, null=True)
    target_model = models.CharField(max_length=60, blank=True, null=True)
    
    variables = models.JSONField(default=list, blank=True)
    
    forked_from = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='forks')
    fork_count = models.IntegerField(default=0)
    
    view_count = models.IntegerField(default=0)
    copy_count = models.IntegerField(default=0)
    save_count = models.IntegerField(default=0)
    comment_count = models.IntegerField(default=0)
    rating_count = models.IntegerField(default=0)
    average_rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.00)
    
    categories = models.ManyToManyField(Category, related_name='prompts', blank=True)
    tags = models.ManyToManyField(Tag, related_name='prompts', blank=True)
    
    is_flagged = models.BooleanField(default=False)
    is_removed = models.BooleanField(default=False)
    removal_reason = models.TextField(blank=True, null=True)
    
    is_featured = models.BooleanField(default=False)
    featured_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    published_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title) + '-' + str(uuid.uuid4())[:8]
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title

class Rating(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    prompt = models.ForeignKey(Prompt, on_delete=models.CASCADE, related_name='ratings')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    value = models.DecimalField(max_digits=2, decimal_places=1, validators=[MinValueValidator(0.5), MaxValueValidator(5.0)])
    review_text = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('prompt', 'user')

class Comment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    prompt = models.ForeignKey(Prompt, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='replies')
    body = models.TextField()
    is_edited = models.BooleanField(default=False)
    is_removed = models.BooleanField(default=False)
    removal_reason = models.TextField(blank=True, null=True)
    like_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Comment by {self.author} on {self.prompt}"

class Collection(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='collections')
    name = models.CharField(max_length=120)
    description = models.TextField(blank=True, null=True)
    visibility = models.CharField(max_length=10, choices=Prompt.VISIBILITY_CHOICES, default='public')
    cover_image_url = models.URLField(blank=True, null=True)
    prompts = models.ManyToManyField(Prompt, through='CollectionItem', related_name='collections')
    prompt_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class CollectionItem(models.Model):
    collection = models.ForeignKey(Collection, on_delete=models.CASCADE)
    prompt = models.ForeignKey(Prompt, on_delete=models.CASCADE)
    added_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    note = models.TextField(blank=True, null=True)
    sort_order = models.IntegerField(default=0)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('collection', 'prompt')

class Bookmark(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='bookmarks')
    prompt = models.ForeignKey(Prompt, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'prompt')

class Notification(models.Model):
    TYPE_CHOICES = [
        ('new_rating', 'New Rating'),
        ('new_comment', 'New Comment'),
        ('comment_reply', 'Comment Reply'),
        ('comment_like', 'Comment Like'),
        ('new_follower', 'New Follower'),
        ('prompt_featured', 'Prompt Featured'),
        ('prompt_forked', 'Prompt Forked'),
        ('prompt_removed', 'Prompt Removed'),
        ('system_message', 'System Message'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    prompt = models.ForeignKey(Prompt, on_delete=models.CASCADE, null=True, blank=True)
    comment = models.ForeignKey(Comment, on_delete=models.CASCADE, null=True, blank=True)
    message = models.TextField(blank=True, null=True)
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

class PromptCopy(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    prompt = models.ForeignKey(Prompt, on_delete=models.CASCADE, related_name='copies')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    ip_hash = models.CharField(max_length=64, blank=True, null=True)
    user_agent = models.TextField(blank=True, null=True)
    copied_at = models.DateTimeField(auto_now_add=True)

class PromptView(models.Model):
    prompt = models.ForeignKey(Prompt, on_delete=models.CASCADE, related_name='views')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    ip_hash = models.CharField(max_length=64, blank=True, null=True)
    viewed_date = models.DateField(auto_now_add=True)

class Report(models.Model):
    REASON_CHOICES = [
        ('spam', 'Spam'),
        ('inappropriate', 'Inappropriate'),
        ('copyright', 'Copyright'),
        ('misinformation', 'Misinformation'),
        ('hate_speech', 'Hate Speech'),
        ('other', 'Other'),
    ]
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('reviewed', 'Reviewed'),
        ('actioned', 'Actioned'),
        ('dismissed', 'Dismissed'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reporter = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reports_filed')
    prompt = models.ForeignKey(Prompt, on_delete=models.CASCADE, null=True, blank=True, related_name='reports')
    comment = models.ForeignKey(Comment, on_delete=models.CASCADE, null=True, blank=True, related_name='reports')
    reason = models.CharField(max_length=20, choices=REASON_CHOICES)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    reviewed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='reports_reviewed')
    reviewed_at = models.DateTimeField(null=True, blank=True)
    action_taken = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Report by {self.reporter} on {self.prompt or self.comment}"
