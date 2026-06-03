import os
import django
import uuid

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.utils.text import slugify
from django.utils import timezone
from prompts.models import Prompt, Category, Tag, Rating, Comment, Bookmark
from accounts.models import User

def seed():
    print("🌱 Seeding database...")

    # ── Categories ──────────────────────────────────────────────
    cats_data = [
        ('coding',      'Coding',            '💻', '#45B7D1', 0),
        ('writing',     'Creative Writing',  '✍️',  '#4ECDC4', 1),
        ('marketing',   'Marketing',         '🚀', '#FF6B6B', 2),
        ('image-gen',   'Image Generation',  '🎨', '#F7D794', 3),
        ('productivity','Productivity',       '⚡', '#A29BFE', 4),
        ('research',    'Research',          '🔬', '#55EFC4', 5),
        ('business',    'Business',          '💼', '#FDCB6E', 6),
        ('education',   'Education',         '📚', '#74B9FF', 7),
    ]
    cats = {}
    for slug, name, emoji, color, order in cats_data:
        c, _ = Category.objects.get_or_create(
            slug=slug,
            defaults={'name': name, 'emoji': emoji, 'color': color, 'sort_order': order}
        )
        cats[slug] = c
    print(f"  ✓ {len(cats)} categories")

    # ── Tags ────────────────────────────────────────────────────
    tags_data = [
        'gpt-4', 'claude', 'midjourney', 'stable-diffusion',
        'python', 'react', 'sql', 'seo', 'copywriting',
        'productivity', 'sales', 'email', 'story', 'code-review',
    ]
    tags = {}
    for t in tags_data:
        obj, _ = Tag.objects.get_or_create(slug=t, defaults={'name': t, 'usage_count': 0})
        tags[t] = obj
    print(f"  ✓ {len(tags)} tags")

    # ── Users ───────────────────────────────────────────────────
    users_data = [
        ('alex@promptatlas.com',   'alex_writes',  'Alex Johnson',   '#3282B8', 1240),
        ('maya@promptatlas.com',   'maya_codes',   'Maya Patel',     '#E84393', 980),
        ('carlos@promptatlas.com', 'carlos_ai',    'Carlos Rivera',  '#27AE60', 2100),
        ('sarah@promptatlas.com',  'sarah_design', 'Sarah Chen',     '#F39C12', 560),
        ('james@promptatlas.com',  'james_mktg',   'James Wilson',   '#8E44AD', 340),
    ]
    users = []
    for email, username, display_name, color, rep in users_data:
        u, created = User.objects.get_or_create(
            email=email,
            defaults={
                'username': username,
                'display_name': display_name,
                'avatar_color': color,
                'reputation_score': rep,
                'is_active': True,
                'is_verified': True,
                'email_verified': True,
            }
        )
        if created:
            u.set_password('Password123!')
            u.save()
        users.append(u)
    print(f"  ✓ {len(users)} demo users")

    # ── Prompts ─────────────────────────────────────────────────
    prompts_data = [
        {
            'title': 'Ultimate Code Review Assistant',
            'body': '''You are a senior software engineer with 15 years of experience. Review the following code and provide:

1. **Security issues** — any vulnerabilities or unsafe patterns
2. **Performance bottlenecks** — inefficient algorithms or unnecessary complexity
3. **Code quality** — readability, naming, and structure
4. **Best practices** — deviations from language idioms or team conventions
5. **Quick wins** — the 3 most impactful changes to make first

Code to review:
```
{{code}}
```

Be direct and constructive. Use line references where possible.''',
            'description': 'Drop in any code and get a structured, actionable review covering security, performance, and quality.',
            'prompt_type': 'text',
            'target_model': 'GPT-4 / Claude',
            'visibility': 'public',
            'author': users[1],
            'cats': ['coding'],
            'tags': ['gpt-4', 'claude', 'code-review', 'python'],
            'rating': 4.8, 'ratings': 142, 'copies': 890, 'views': 4200,
        },
        {
            'title': 'Cinematic Portrait Photography — Moody Film',
            'body': '''Portrait of {{subject}}, shot on a Leica M6 with 50mm Summilux f/1.4, Kodak Portra 400 film, golden hour rim lighting from behind, shallow depth of field, slightly underexposed, film grain, natural skin tones, bokeh background of {{setting}}, editorial fashion photography style, high contrast shadows, cinematic mood''',
            'description': 'Consistently produces gorgeous film-look portraits. Works best with Midjourney v6 and DALL-E 3.',
            'prompt_type': 'image',
            'target_model': 'Midjourney v6',
            'visibility': 'public',
            'author': users[3],
            'cats': ['image-gen'],
            'tags': ['midjourney', 'stable-diffusion'],
            'rating': 4.9, 'ratings': 312, 'copies': 2100, 'views': 8900,
        },
        {
            'title': 'Cold Email That Actually Gets Replies',
            'body': '''Write a cold email for {{sender_name}} reaching out to {{recipient_role}} at {{company_type}} companies.

Context:
- Product/service: {{what_we_sell}}
- Key pain point we solve: {{pain_point}}
- Social proof: {{proof}}

Rules:
- Subject line under 6 words, create curiosity
- First line: reference something specific about their company/role (NOT "I hope this email finds you well")
- Problem-agitate-solve structure in 3 short paragraphs
- One clear CTA, ask for 15 minutes not "a call"
- Total length: under 120 words
- Tone: confident peer, not vendor pitching

Output the subject line separately, then the email body.''',
            'description': 'A proven cold email framework with 34% average open rate across 12 campaigns.',
            'prompt_type': 'text',
            'target_model': 'GPT-4',
            'visibility': 'public',
            'author': users[4],
            'cats': ['marketing', 'business'],
            'tags': ['gpt-4', 'email', 'copywriting', 'sales'],
            'rating': 4.7, 'ratings': 89, 'copies': 650, 'views': 3100,
        },
        {
            'title': 'SQL Query Explainer & Optimizer',
            'body': '''Analyze this SQL query and give me:

**1. Plain English explanation**
What does this query do? Explain it like I'm a product manager.

**2. Step-by-step execution**
Walk through how the database engine actually runs this.

**3. Performance analysis**
- Estimated cost issues (full scans, missing indexes, etc.)
- N+1 risks
- Any implicit type conversions

**4. Optimized version**
Rewrite it to be faster. Show before/after and explain each change.

**5. Indexes to add**
List CREATE INDEX statements that would help this query.

Query:
```sql
{{query}}
```

Database: {{database_type}} (PostgreSQL / MySQL / SQLite)''',
            'description': 'Paste any SQL query and get a full breakdown + optimized version. Saved our team hours on a slow reporting query.',
            'prompt_type': 'text',
            'target_model': 'Claude / GPT-4',
            'visibility': 'public',
            'author': users[1],
            'cats': ['coding', 'productivity'],
            'tags': ['sql', 'python', 'code-review'],
            'rating': 4.6, 'ratings': 67, 'copies': 410, 'views': 1800,
        },
        {
            'title': 'Short Story from a Single Sentence',
            'body': '''Take this single sentence and expand it into a complete short story of exactly 500 words:

"{{seed_sentence}}"

Requirements:
- Genre: {{genre}} (literary fiction / thriller / sci-fi / fantasy / horror)
- Perspective: third person limited
- Tense: past tense
- Must include: a turning point in the middle, sensory details in every paragraph, and a final line that echoes the opening sentence
- No dialogue until the second half
- Show don't tell — no emotion words (happy, sad, scared, angry)

Output only the story, no preamble.''',
            'description': 'Give it one sentence and it builds a complete, structured short story around it. Great for writer\'s block.',
            'prompt_type': 'text',
            'target_model': 'Claude / GPT-4',
            'visibility': 'public',
            'author': users[0],
            'cats': ['writing'],
            'tags': ['claude', 'gpt-4', 'story'],
            'rating': 4.5, 'ratings': 54, 'copies': 320, 'views': 1400,
        },
        {
            'title': 'Weekly Productivity Audit',
            'body': '''I'm going to describe my week. Analyze it and give me a structured productivity audit.

My week:
{{week_summary}}

Please provide:

**Time Audit**
Categorize where my time went (deep work / meetings / admin / reactive / wasted). Estimate percentages.

**Energy vs Output Mismatch**
Where am I spending high energy on low-value tasks? Vice versa?

**Top 3 Leverage Points**
The 3 changes that would have the biggest impact on my output next week.

**Scheduling Template**
A suggested weekly schedule based on my patterns, blocking deep work at my apparent peak hours.

**One Question to Ask Myself Daily**
A single question that would have improved this week most.

Be honest. Don't sugarcoat.''',
            'description': 'Paste a brain dump of your week and get a sharp, honest breakdown of where your time and energy actually went.',
            'prompt_type': 'text',
            'target_model': 'Claude',
            'visibility': 'public',
            'author': users[2],
            'cats': ['productivity', 'business'],
            'tags': ['claude', 'productivity'],
            'rating': 4.4, 'ratings': 38, 'copies': 280, 'views': 1100,
        },
        {
            'title': 'React Component Generator with Tests',
            'body': '''Generate a production-ready React component for: {{component_description}}

Requirements:
- TypeScript with proper types/interfaces
- Functional component with hooks
- Props interface exported separately
- Handle loading, error, and empty states
- Accessible (ARIA labels, keyboard navigation)
- Responsive (mobile-first)
- No external dependencies beyond React

Also generate:
1. Unit tests using React Testing Library + Vitest
2. Storybook story with all states shown
3. JSDoc comments on the component and all props

Style: {{styling_approach}} (Tailwind / CSS Modules / styled-components)''',
            'description': 'Describe any UI component and get production-ready code with types, tests, and Storybook stories.',
            'prompt_type': 'text',
            'target_model': 'Claude / GPT-4',
            'visibility': 'public',
            'author': users[1],
            'cats': ['coding'],
            'tags': ['react', 'python', 'gpt-4', 'claude'],
            'rating': 4.7, 'ratings': 103, 'copies': 720, 'views': 3300,
        },
        {
            'title': 'Neon Cyberpunk Cityscape',
            'body': '''Aerial view of a dense cyberpunk megacity at night, {{time_of_day}}, towering skyscrapers covered in holographic advertisements in Japanese and Chinese, rain-slicked streets reflecting neon pink and cyan lights, flying vehicles leaving light trails, steam rising from grates, massive LED billboards, crowded street markets below, dystopian atmosphere, ultra detailed, cinematic, 8K, volumetric fog, lens flare, --ar 16:9 --v 6''',
            'description': 'Perfect for sci-fi worldbuilding and concept art. Swap the time of day for dawn/dusk/storm variants.',
            'prompt_type': 'image',
            'target_model': 'Midjourney v6',
            'visibility': 'public',
            'author': users[3],
            'cats': ['image-gen'],
            'tags': ['midjourney', 'stable-diffusion'],
            'rating': 4.8, 'ratings': 201, 'copies': 1450, 'views': 6200,
        },
        {
            'title': 'Market Research in 10 Minutes',
            'body': '''Conduct rapid market research for: {{product_or_idea}}

Target customer: {{target_customer}}

Provide:

**Market Size Estimate**
TAM / SAM / SOM with rough numbers and assumptions.

**Top 5 Competitors**
Name, positioning, pricing model, key differentiator, obvious weakness.

**Customer Pain Points**
Top 5 pains this customer has, ranked by intensity. Quote the kind of language they'd use to describe each pain.

**Channels to Reach Them**
Where does this customer hang out online and offline? Rank by cost-effectiveness.

**Key Risks**
Top 3 reasons this idea could fail in this market.

**One Contrarian Take**
A non-obvious insight about this market that most people miss.

Cite your reasoning. Flag where you're uncertain.''',
            'description': 'Get a full market analysis in minutes. Not a replacement for real research, but a fast way to pressure-test an idea.',
            'prompt_type': 'text',
            'target_model': 'Claude / GPT-4',
            'visibility': 'public',
            'author': users[2],
            'cats': ['research', 'business', 'marketing'],
            'tags': ['claude', 'gpt-4', 'seo'],
            'rating': 4.6, 'ratings': 76, 'copies': 530, 'views': 2400,
        },
        {
            'title': 'Explain Like I\'m 10 — Any Concept',
            'body': '''Explain {{concept}} to a curious 10-year-old who loves {{interest}}.

Rules:
- Use one analogy involving {{interest}} as the main explanation tool
- No jargon. If you must use a technical term, define it immediately
- Build from something they already know
- End with one "wow fact" that will make them want to tell their friends
- Keep it under 200 words
- Tone: excited teacher, not textbook

Then give a 1-sentence "actually accurate" version for the adult reading over their shoulder.''',
            'description': 'Makes any concept click instantly. The "actually accurate" line is a great sanity check for yourself.',
            'prompt_type': 'text',
            'target_model': 'Claude / GPT-4',
            'visibility': 'public',
            'author': users[0],
            'cats': ['education'],
            'tags': ['claude', 'gpt-4'],
            'rating': 4.9, 'ratings': 188, 'copies': 1200, 'views': 5100,
        },
    ]

    created_prompts = []
    for i, data in enumerate(prompts_data):
        slug = slugify(data['title']) + '-' + str(uuid.uuid4())[:6]
        p, created = Prompt.objects.get_or_create(
            title=data['title'],
            author=data['author'],
            defaults={
                'slug': slug,
                'body': data['body'],
                'description': data['description'],
                'prompt_type': data['prompt_type'],
                'target_model': data['target_model'],
                'visibility': data['visibility'],
                'average_rating': data['rating'],
                'rating_count': data['ratings'],
                'copy_count': data['copies'],
                'view_count': data['views'],
                'comment_count': 2,
            }
        )
        if created:
            for cat_slug in data['cats']:
                p.categories.add(cats[cat_slug])
            for tag_name in data['tags']:
                if tag_name in tags:
                    p.tags.add(tags[tag_name])
        created_prompts.append(p)

    print(f"  ✓ {len(created_prompts)} prompts")

    # ── Comments ─────────────────────────────────────────────────
    comments_data = [
        (0, users[2], "This saved me so much time on a code review yesterday. The security section caught a SQL injection I missed. 🔥"),
        (0, users[4], "Works great with Claude Sonnet. The line references make it really actionable."),
        (1, users[0], "The Portra 400 reference makes such a difference. Tried 50+ portrait prompts and this is the most consistent."),
        (2, users[3], "Used this for a SaaS outreach campaign. 41% open rate on 200 sends. Legit works."),
        (6, users[2], "Added 'use shadcn/ui components' to the style section and it generates perfect components."),
        (9, users[1], "The 'actually accurate' line at the end is genius. Used it to explain transformers to my PM."),
    ]
    for prompt_idx, author, body in comments_data:
        Comment.objects.get_or_create(
            prompt=created_prompts[prompt_idx],
            author=author,
            body=body,
        )
    print(f"  ✓ {len(comments_data)} comments")

    # ── Update category prompt counts ────────────────────────────
    for cat in cats.values():
        cat.prompt_count = cat.prompts.count()
        cat.save(update_fields=['prompt_count'])

    # ── Update tag usage counts ───────────────────────────────────
    for tag in tags.values():
        tag.usage_count = tag.prompts.count()
        tag.save(update_fields=['usage_count'])

    # ── Update user prompt counts ─────────────────────────────────
    for u in users:
        u.prompt_count = Prompt.objects.filter(author=u).count()
        u.save(update_fields=['prompt_count'])

    print("\n✅ Done! Your feed now has:")
    print(f"   • {len(cats)} categories")
    print(f"   • {len(tags)} tags")
    print(f"   • {len(users)} demo users")
    print(f"   • {len(created_prompts)} prompts (text + image)")
    print(f"   • {len(comments_data)} comments")
    print("\n   Login with: alex@promptatlas.com / Password123!")

if __name__ == '__main__':
    seed()
