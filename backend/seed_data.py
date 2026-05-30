import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from prompts.models import Prompt, Category, Tag
from accounts.models import User
from django.utils.text import slugify

def seed():
    print("Seeding database...")
    
    # Categories
    cat_marketing, _ = Category.objects.get_or_create(slug='marketing', defaults={'name': 'Marketing', 'emoji': '🚀', 'color': '#FF6B6B'})
    cat_creative, _ = Category.objects.get_or_create(slug='creative', defaults={'name': 'Creative Writing', 'emoji': '✍️', 'color': '#4ECDC4'})
    cat_coding, _ = Category.objects.get_or_create(slug='coding', defaults={'name': 'Coding', 'emoji': '💻', 'color': '#45B7D1'})
    cat_image, _ = Category.objects.get_or_create(slug='image-gen', defaults={'name': 'Image Generation', 'emoji': '🎨', 'color': '#F7D794'})

    # Tags
    tags = ['gpt-4', 'midjourney', 'seo', 'copywriting', 'python', 'react']
    tag_objs = {}
    for t in tags:
        tag_objs[t], _ = Tag.objects.get_or_create(slug=t, defaults={'name': t.capitalize()})

    # Users
    admin = User.objects.filter(is_superuser=True).first()
    if not admin:
        admin = User.objects.create_superuser('admin@promptatlas.com', 'admin', 'Password123!')
    
    # Prompts
    prompts_data = [
        {
            'title': 'Viral Marketing Email Hook',
            'body': 'Write a 3-sentence email hook for [product] that uses the Zeigarnik effect...',
            'description': 'Highly effective for SaaS products.',
            'type': 'text',
            'cat': cat_marketing,
        },
        {
            'title': 'Cyberpunk Cityscape Midjourney',
            'body': 'Cyberpunk city at night, rain slicked streets, neon lights reflecting...',
            'description': 'Works best with v6.',
            'type': 'image',
            'cat': cat_image,
            'img': 'https://images.unsplash.com/photo-1605142859862-978be7eba909?q=80&w=2670&auto=format&fit=crop'
        },
        {
            'title': 'React Component Refactorer',
            'body': 'You are a senior React developer. Refactor the following code to use functional components and hooks...',
            'description': 'Saves hours of legacy work.',
            'type': 'text',
            'cat': cat_coding,
        }
    ]

    for p in prompts_data:
        prompt, created = Prompt.objects.get_or_create(
            title=p['title'],
            defaults={
                'author': admin,
                'body': p['body'],
                'description': p['description'],
                'prompt_type': p['type'],
                'cover_image_url': p.get('img'),
                'average_rating': 4.5,
                'rating_count': 12,
            }
        )
        if created:
            prompt.categories.add(p['cat'])
            print(f"Created prompt: {p['title']}")

    print("Seeding complete!")

if __name__ == '__main__':
    seed()
