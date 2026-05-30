# PromptAtlas — Full Production Implementation Plan

> **Audience:** Senior developer / engineering lead  
> **Goal:** Take the existing React UI prototype to a fully deployed, production-grade, AI-prompt social media platform  
> **Tone:** This is a technical spec. Every decision here is intentional. Follow it precisely.

---

## Table of Contents

1. [Code Audit of the Current Codebase](#1-code-audit-of-the-current-codebase)
2. [What PromptAtlas Actually Is](#2-what-promptatlas-actually-is)
3. [Complete Database Schema](#3-complete-database-schema)
4. [System Architecture](#4-system-architecture)
5. [Security Architecture](#5-security-architecture)
6. [API Contract](#6-api-contract)
7. [Milestone Roadmap](#7-milestone-roadmap)
8. [Frontend Migration Plan](#8-frontend-migration-plan)
9. [Real-Time & WebSocket Layer](#9-real-time--websocket-layer)
10. [Infrastructure & DevOps](#10-infrastructure--devops)
11. [Content Moderation](#11-content-moderation)
12. [Testing Strategy](#12-testing-strategy)
13. [Environment Variables Reference](#13-environment-variables-reference)

---

## 1. Code Audit of the Current Codebase

### What exists (the prototype)

| File | Status | Notes |
|---|---|---|
| `src/App.jsx` | ✅ Clean | Simple shell, no bugs. Needs routing added. |
| `src/components/Navbar.jsx` | ⚠️ Static | Avatar is hardcoded `AJ`. No auth state. Tabs don't route anywhere. |
| `src/components/LeftSidebar.jsx` | ⚠️ Static | User profile (`Alex Johnson`, `2,840 rep`) is hardcoded. No real user. |
| `src/components/Feed.jsx` | ⚠️ Static data | Good component architecture. Needs API integration. |
| `src/components/TextCard.jsx` | ✅ Good | Clean layout. Just needs real data props. |
| `src/components/ImageCard.jsx` | ✅ Good | Lazy loading already added. Good. |
| `src/components/BoltRating.jsx` | ⚠️ Broken | `handleClick` has a dead TODO comment — it updates local state only. Rating never persists to any backend. |
| `src/components/CopyButton.jsx` | ✅ Good | Clipboard logic is correct. |
| `src/components/Avatar.jsx` | ⚠️ Minor | Accepts `av` as an integer index into a hardcoded color array. Should accept `avatarUrl` with a colour fallback. |
| `src/hooks/useRating.js` | ⚠️ Broken | Same issue as BoltRating — the `fetch` call is commented out with a `TODO`. |
| `src/data/prompts.js` | 🔴 Must delete | This is mock data. The entire file must be removed once the API is wired up. |
| `src/components/RightSidebar.jsx` | 🔴 All static | Tags, Top Prompters, Top Categories — all hardcoded. These must come from API aggregation queries. |
| `src/index.css` | ✅ Excellent | Token-based design system. Keep all CSS variables. Do not break the dark theme. |
| `vite.config.js` | ✅ Good | Standard Vite/React setup. Add `proxy` block for dev API forwarding. |
| `package.json` | ⚠️ Missing deps | Needs `react-router-dom`, `axios` or `@tanstack/react-query`, `socket.io-client`, a form library. |

### Bugs found

1. **BoltRating rating is ephemeral.** Clicking a rating changes local state but the `fetch` call to `/api/prompts/${id}/rate/` is commented out. The star value resets on page refresh.
2. **No routing.** The navbar tabs (`Home`, `Alerts`, `Starred`) and sidebar links (`My Prompts`, `Collections`) update state but do not change the URL. Deep linking, browser back/forward, and sharing links are broken.
3. **Auth is entirely absent.** The "Share a Prompt" button exists but clicking it has no handler. There is no login flow.
4. **CopyButton has a subtle bug.** `navigator.clipboard.writeText(text).finally(...)` — the `.finally` fires even on rejection (permission denied), so `Copied!` flashes even if the copy failed. Should use `.then()` only.
5. **All data is static.** `TEXT_PROMPTS` and `IMAGE_PROMPTS` in `src/data/prompts.js` are hardcoded. The app has no live data.
6. **No error boundaries.** If any component throws, the entire app crashes. React Error Boundaries need to be added.
7. **No loading states.** When API calls are added, there are no skeleton loaders anywhere.
8. **Image sources are Unsplash hotlinks.** Production images must be on your own CDN (S3 + CloudFront). Hotlinking Unsplash in production violates their ToS and will break.

---

## 2. What PromptAtlas Actually Is

PromptAtlas is a **social platform specifically for AI prompts.** Think of it as the intersection of Product Hunt + GitHub Gist + Pinterest, but everything is an AI prompt (for ChatGPT, Midjourney, Stable Diffusion, Claude, etc.).

### Core user actions

- **Discover** prompts (text-based and image-generation prompts)
- **Rate** prompts using a 5-bolt system
- **Copy** prompts directly to clipboard
- **Share / publish** your own prompts
- **Star / bookmark** prompts to personal collections
- **Follow** other prompters
- **Comment** on prompts
- **Remix** someone's prompt (fork and modify)
- **Get notified** when someone rates/comments on your prompt

---

## 3. Complete Database Schema

### Technology choice: PostgreSQL (primary) + Redis (cache + queues)

PostgreSQL handles all relational data. Redis handles sessions, rate limiting, real-time pub/sub, and feed caching.

---

### 3.1 Users & Auth

```sql
-- Core user account
CREATE TABLE users (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username            VARCHAR(30) UNIQUE NOT NULL,
    email               VARCHAR(255) UNIQUE NOT NULL,
    email_verified      BOOLEAN DEFAULT FALSE,
    password_hash       TEXT,                          -- NULL for OAuth-only users
    display_name        VARCHAR(80) NOT NULL,
    bio                 TEXT,
    avatar_url          TEXT,                          -- S3 URL
    avatar_color        CHAR(7) DEFAULT '#3282B8',     -- fallback if no avatar_url
    website_url         TEXT,
    location            VARCHAR(100),
    reputation_score    INTEGER DEFAULT 0,             -- computed: sum of all prompt ratings received × weights
    prompt_count        INTEGER DEFAULT 0,             -- denormalised counter
    follower_count      INTEGER DEFAULT 0,             -- denormalised counter
    following_count     INTEGER DEFAULT 0,             -- denormalised counter
    is_verified         BOOLEAN DEFAULT FALSE,         -- blue checkmark
    is_staff            BOOLEAN DEFAULT FALSE,
    is_banned           BOOLEAN DEFAULT FALSE,
    ban_reason          TEXT,
    banned_at           TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT now(),
    updated_at          TIMESTAMPTZ DEFAULT now(),
    last_active_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email    ON users(email);
CREATE INDEX idx_users_rep      ON users(reputation_score DESC);

-- OAuth social logins (Google, GitHub, Discord, etc.)
CREATE TABLE oauth_providers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider        VARCHAR(30) NOT NULL,   -- 'google' | 'github' | 'discord'
    provider_uid    VARCHAR(255) NOT NULL,  -- the uid from that provider
    access_token    TEXT,                   -- encrypted at rest
    refresh_token   TEXT,                   -- encrypted at rest
    token_expires_at TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE(provider, provider_uid)
);

-- Email verification & password reset tokens
CREATE TABLE auth_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  TEXT NOT NULL,              -- SHA-256 of the raw token
    purpose     VARCHAR(30) NOT NULL,       -- 'email_verify' | 'password_reset' | 'magic_link'
    used_at     TIMESTAMPTZ,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_auth_tokens_hash ON auth_tokens(token_hash);

-- Refresh tokens for JWT sessions
CREATE TABLE refresh_tokens (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash      TEXT NOT NULL UNIQUE,   -- SHA-256 of the token stored client-side
    device_info     JSONB,                  -- { ua, ip, country }
    created_at      TIMESTAMPTZ DEFAULT now(),
    last_used_at    TIMESTAMPTZ DEFAULT now(),
    expires_at      TIMESTAMPTZ NOT NULL,
    revoked_at      TIMESTAMPTZ
);
```

---

### 3.2 Prompts

```sql
-- Prompt type enum
CREATE TYPE prompt_type AS ENUM ('text', 'image', 'video', 'audio', 'code');

-- Prompt visibility
CREATE TYPE prompt_visibility AS ENUM ('public', 'unlisted', 'private');

-- The core prompts table
CREATE TABLE prompts (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    slug                VARCHAR(120) UNIQUE NOT NULL,   -- URL-safe, e.g. "viral-launch-email-sara"
    title               VARCHAR(200) NOT NULL,
    body                TEXT NOT NULL,                  -- the actual prompt text
    description         TEXT,                           -- author's explanation of the prompt
    prompt_type         prompt_type NOT NULL DEFAULT 'text',
    visibility          prompt_visibility NOT NULL DEFAULT 'public',
    
    -- for image prompts: reference image generated with this prompt
    cover_image_url     TEXT,
    cover_image_key     TEXT,                           -- S3 key
    
    -- which AI model this prompt is designed for
    target_model        VARCHAR(60),                    -- 'chatgpt-4o' | 'midjourney-v6' | 'claude-3-5' etc.
    
    -- template variables — extracted from [PLACEHOLDERS] in body
    variables           JSONB DEFAULT '[]',             -- [{"key": "PRODUCT", "label": "Product name", "example": "iPhone"}]
    
    -- remix / fork relationship
    forked_from_id      UUID REFERENCES prompts(id) ON DELETE SET NULL,
    fork_count          INTEGER DEFAULT 0,              -- denormalised
    
    -- engagement counters — denormalised for feed performance
    view_count          INTEGER DEFAULT 0,
    copy_count          INTEGER DEFAULT 0,
    save_count          INTEGER DEFAULT 0,
    comment_count       INTEGER DEFAULT 0,
    rating_count        INTEGER DEFAULT 0,
    average_rating      NUMERIC(3,2) DEFAULT 0,         -- recomputed on each rating
    
    -- moderation
    is_flagged          BOOLEAN DEFAULT FALSE,
    is_removed          BOOLEAN DEFAULT FALSE,
    removal_reason      TEXT,
    
    -- SEO / discovery
    is_featured         BOOLEAN DEFAULT FALSE,
    featured_at         TIMESTAMPTZ,
    
    created_at          TIMESTAMPTZ DEFAULT now(),
    updated_at          TIMESTAMPTZ DEFAULT now(),
    published_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_prompts_author        ON prompts(author_id);
CREATE INDEX idx_prompts_type          ON prompts(prompt_type);
CREATE INDEX idx_prompts_visibility    ON prompts(visibility) WHERE visibility = 'public';
CREATE INDEX idx_prompts_rating        ON prompts(average_rating DESC);
CREATE INDEX idx_prompts_published     ON prompts(published_at DESC);
CREATE INDEX idx_prompts_featured      ON prompts(is_featured, featured_at DESC);
CREATE INDEX idx_prompts_forked        ON prompts(forked_from_id);
-- Full text search
CREATE INDEX idx_prompts_fts ON prompts USING gin(to_tsvector('english', title || ' ' || coalesce(description, '') || ' ' || body));

-- Prompt version history (every edit creates a version)
CREATE TABLE prompt_versions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prompt_id   UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
    version     INTEGER NOT NULL,
    title       VARCHAR(200) NOT NULL,
    body        TEXT NOT NULL,
    description TEXT,
    edited_by   UUID NOT NULL REFERENCES users(id),
    created_at  TIMESTAMPTZ DEFAULT now(),
    UNIQUE(prompt_id, version)
);
```

---

### 3.3 Categories & Tags

```sql
-- Curated categories (admin-managed)
CREATE TABLE categories (
    id          SERIAL PRIMARY KEY,
    slug        VARCHAR(60) UNIQUE NOT NULL,
    name        VARCHAR(80) NOT NULL,
    description TEXT,
    emoji       VARCHAR(8),
    color       CHAR(7),
    sort_order  INTEGER DEFAULT 0,
    prompt_count INTEGER DEFAULT 0,     -- denormalised
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- Many-to-many: prompts ↔ categories
CREATE TABLE prompt_categories (
    prompt_id   UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    PRIMARY KEY (prompt_id, category_id)
);

-- Tags (user-generated)
CREATE TABLE tags (
    id          SERIAL PRIMARY KEY,
    slug        VARCHAR(60) UNIQUE NOT NULL,   -- '#marketing' stored as 'marketing'
    name        VARCHAR(60) NOT NULL,
    usage_count INTEGER DEFAULT 0,             -- denormalised
    created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_tags_usage ON tags(usage_count DESC);

-- Many-to-many: prompts ↔ tags
CREATE TABLE prompt_tags (
    prompt_id   UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
    tag_id      INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (prompt_id, tag_id)
);
```

---

### 3.4 Ratings & Reviews

```sql
-- One rating per user per prompt
CREATE TABLE ratings (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prompt_id   UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    value       NUMERIC(2,1) NOT NULL CHECK (value >= 0.5 AND value <= 5.0),
    review_text TEXT,                   -- optional written review
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now(),
    UNIQUE(prompt_id, user_id)          -- one rating per user per prompt
);

CREATE INDEX idx_ratings_prompt ON ratings(prompt_id);
CREATE INDEX idx_ratings_user   ON ratings(user_id);

-- After INSERT/UPDATE on ratings, a trigger recomputes prompts.average_rating and prompts.rating_count
CREATE OR REPLACE FUNCTION update_prompt_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE prompts
    SET
        average_rating = (SELECT ROUND(AVG(value)::NUMERIC, 2) FROM ratings WHERE prompt_id = NEW.prompt_id),
        rating_count   = (SELECT COUNT(*) FROM ratings WHERE prompt_id = NEW.prompt_id),
        updated_at     = now()
    WHERE id = NEW.prompt_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_rating
AFTER INSERT OR UPDATE ON ratings
FOR EACH ROW EXECUTE FUNCTION update_prompt_rating();
```

---

### 3.5 Comments

```sql
CREATE TABLE comments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prompt_id       UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
    author_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id       UUID REFERENCES comments(id) ON DELETE CASCADE,  -- NULL = top-level
    body            TEXT NOT NULL,
    is_edited       BOOLEAN DEFAULT FALSE,
    is_removed      BOOLEAN DEFAULT FALSE,
    removal_reason  TEXT,
    like_count      INTEGER DEFAULT 0,  -- denormalised
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_comments_prompt    ON comments(prompt_id, created_at DESC);
CREATE INDEX idx_comments_parent    ON comments(parent_id);
CREATE INDEX idx_comments_author    ON comments(author_id);

-- Comment likes
CREATE TABLE comment_likes (
    comment_id  UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (comment_id, user_id)
);
```

---

### 3.6 Social Graph

```sql
-- Follows: user_id follows target_id
CREATE TABLE follows (
    follower_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (follower_id, following_id),
    CHECK (follower_id <> following_id)  -- cannot follow yourself
);

CREATE INDEX idx_follows_follower   ON follows(follower_id);
CREATE INDEX idx_follows_following  ON follows(following_id);

-- Triggers to maintain denormalised follower_count and following_count
CREATE OR REPLACE FUNCTION update_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE users SET follower_count  = follower_count  + 1 WHERE id = NEW.following_id;
        UPDATE users SET following_count = following_count + 1 WHERE id = NEW.follower_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE users SET follower_count  = GREATEST(follower_count  - 1, 0) WHERE id = OLD.following_id;
        UPDATE users SET following_count = GREATEST(following_count - 1, 0) WHERE id = OLD.follower_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_follow_counts
AFTER INSERT OR DELETE ON follows
FOR EACH ROW EXECUTE FUNCTION update_follow_counts();
```

---

### 3.7 Collections / Bookmarks

```sql
-- User-created collections (like Pinterest boards)
CREATE TABLE collections (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR(120) NOT NULL,
    description     TEXT,
    visibility      prompt_visibility DEFAULT 'public',
    cover_image_url TEXT,
    prompt_count    INTEGER DEFAULT 0,  -- denormalised
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_collections_owner ON collections(owner_id);

-- Prompts inside a collection
CREATE TABLE collection_items (
    collection_id   UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    prompt_id       UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
    added_by        UUID NOT NULL REFERENCES users(id),
    note            TEXT,               -- user's personal note on this prompt
    sort_order      INTEGER DEFAULT 0,
    added_at        TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (collection_id, prompt_id)
);

-- "Quick Save" / bookmark (saves to user's default collection)
CREATE TABLE bookmarks (
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    prompt_id   UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (user_id, prompt_id)
);
```

---

### 3.8 Notifications

```sql
CREATE TYPE notification_type AS ENUM (
    'new_rating',
    'new_comment',
    'comment_reply',
    'comment_like',
    'new_follower',
    'prompt_featured',
    'prompt_forked',
    'prompt_removed',
    'system_message'
);

CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    actor_id        UUID REFERENCES users(id) ON DELETE SET NULL,   -- who triggered it (NULL for system)
    type            notification_type NOT NULL,
    prompt_id       UUID REFERENCES prompts(id) ON DELETE CASCADE,
    comment_id      UUID REFERENCES comments(id) ON DELETE CASCADE,
    message         TEXT,               -- rendered message string
    is_read         BOOLEAN DEFAULT FALSE,
    read_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notifications_recipient ON notifications(recipient_id, is_read, created_at DESC);
```

---

### 3.9 Copy / View Tracking

```sql
-- Every copy of a prompt is logged (for analytics and abuse detection)
CREATE TABLE prompt_copies (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prompt_id   UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
    user_id     UUID REFERENCES users(id) ON DELETE SET NULL,   -- NULL if anonymous
    ip_hash     TEXT,                   -- SHA-256 of IP (never store raw IP)
    user_agent  TEXT,
    copied_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_prompt_copies_prompt ON prompt_copies(prompt_id, copied_at DESC);

-- Prompt views (deduplicated — 1 view per user per 24h per prompt)
CREATE TABLE prompt_views (
    prompt_id   UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
    user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    ip_hash     TEXT,
    viewed_date DATE NOT NULL DEFAULT CURRENT_DATE,
    PRIMARY KEY (prompt_id, COALESCE(user_id::TEXT, ip_hash), viewed_date)
);
```

---

### 3.10 Moderation

```sql
CREATE TYPE report_reason AS ENUM (
    'spam',
    'inappropriate',
    'misinformation',
    'copyright',
    'hate_speech',
    'malicious_prompt',
    'other'
);

CREATE TYPE report_status AS ENUM ('pending', 'reviewed', 'actioned', 'dismissed');

CREATE TABLE reports (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    prompt_id       UUID REFERENCES prompts(id) ON DELETE CASCADE,
    comment_id      UUID REFERENCES comments(id) ON DELETE CASCADE,
    reported_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    reason          report_reason NOT NULL,
    description     TEXT,
    status          report_status DEFAULT 'pending',
    reviewed_by     UUID REFERENCES users(id),
    reviewed_at     TIMESTAMPTZ,
    action_taken    TEXT,
    created_at      TIMESTAMPTZ DEFAULT now(),
    CHECK (
        (prompt_id IS NOT NULL)::INT +
        (comment_id IS NOT NULL)::INT +
        (reported_user_id IS NOT NULL)::INT = 1
    )
);

CREATE INDEX idx_reports_status ON reports(status, created_at ASC);
```

---

## 4. System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     CLIENT LAYER                        │
│   React + Vite (Web)   │   React Native (Mobile later)  │
└────────────┬────────────┴──────────────┬────────────────┘
             │ HTTPS + WSS               │
┌────────────▼───────────────────────────▼────────────────┐
│               CLOUDFLARE (CDN + WAF + DDoS)             │
└────────────┬────────────────────────────────────────────┘
             │
┌────────────▼────────────────────────────────────────────┐
│                     API GATEWAY                         │
│        (NGINX reverse proxy / AWS API Gateway)          │
│    Rate limiting │ SSL termination │ Request logging     │
└────────┬─────────────────────────┬───────────────────────┘
         │                         │
┌────────▼──────────┐   ┌──────────▼───────────────────┐
│   REST API        │   │   WebSocket Server            │
│   (FastAPI/       │   │   (Socket.io or Django        │
│    Django)        │   │    Channels)                  │
└────────┬──────────┘   └──────────┬───────────────────┘
         │                         │
┌────────▼─────────────────────────▼────────────────────┐
│                   SERVICE LAYER                        │
│  AuthService │ PromptService │ FeedService             │
│  NotificationService │ SearchService │ MediaService    │
└──────┬────────────────────────────┬────────────────────┘
       │                            │
┌──────▼────────┐         ┌─────────▼──────┐
│  PostgreSQL   │         │  Redis         │
│  (Primary DB) │         │  (Cache,       │
│               │         │   Sessions,    │
│  Read Replica │         │   Pub/Sub,     │
│  (for reads)  │         │   Rate limits) │
└───────────────┘         └────────────────┘
       │
┌──────▼────────────────────────────────────────────────┐
│              OBJECT STORAGE                            │
│   Amazon S3 (images, avatars, audio, video)            │
│   + CloudFront CDN for fast delivery worldwide         │
└────────────────────────────────────────────────────────┘
```

### Backend framework decision

Use **Django + Django REST Framework + Django Channels** if you want batteries-included (admin panel, ORM, migrations, auth out of the box). Use **FastAPI** if you want maximum performance and you're comfortable setting up more yourself.

**Recommendation: Django.** The existing codebase comments reference Django (`# TODO Django: fetch(...)`) and the admin panel for content moderation is invaluable.

---

## 5. Security Architecture

### Authentication flow

```
1. User submits email + password
2. Server verifies password_hash using argon2-cffi
3. Server issues:
   - Access Token: JWT, signed with RS256, expires in 15 minutes
   - Refresh Token: opaque random UUID, stored in DB, sent as HttpOnly SameSite=Strict cookie
4. Client stores Access Token in memory (NOT localStorage, NOT sessionStorage)
5. When Access Token expires → client sends refresh request → server validates Refresh Token → issues new pair
6. Logout → server revokes Refresh Token in DB → client clears memory
```

### Security checklist (implement all of these before going to production)

| Control | Implementation |
|---|---|
| Password hashing | `argon2-cffi` (Argon2id, time=3, memory=65536, parallelism=4) |
| JWT signing | RS256 (asymmetric) — rotate keys every 90 days |
| Transport | TLS 1.3 only. HSTS with preload. |
| CSRF | Double-submit cookie pattern. Django's built-in CSRF middleware. |
| Rate limiting | Redis-backed: 5 login attempts / 15 min per IP. 100 API req/min per user. |
| SQL injection | Use ORM only. Never interpolate user input into raw queries. |
| XSS | React escapes by default. Never use `dangerouslySetInnerHTML`. CSP header: `script-src 'self'`. |
| File uploads | Validate MIME type server-side (not extension). Scan with ClamAV. Resize/re-encode images via Pillow before storing. Never serve user uploads from the same origin as the app. |
| Secrets | Never in code. Use AWS Secrets Manager or `.env` (local only, gitignored). |
| OAuth tokens | Encrypt at rest in DB using AES-256-GCM with a key stored in Secrets Manager. |
| IP logging | Never store raw IPs. Always store `SHA-256(IP + daily_salt)`. |
| Admin panel | Separate subdomain. IP allowlist. MFA required. |
| Dependency audit | `pip-audit` and `npm audit` in CI. Auto-PR Dependabot. |

---

## 6. API Contract

All endpoints are prefixed with `/api/v1/`. All responses are JSON. Auth endpoints return tokens. Protected endpoints require `Authorization: Bearer <access_token>` header.

### Auth

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register/` | Register with email + password |
| POST | `/auth/login/` | Login, get access + refresh token |
| POST | `/auth/refresh/` | Refresh access token |
| POST | `/auth/logout/` | Revoke refresh token |
| POST | `/auth/verify-email/` | Verify email with token |
| POST | `/auth/forgot-password/` | Send reset email |
| POST | `/auth/reset-password/` | Reset password with token |
| GET | `/auth/oauth/{provider}/` | Initiate OAuth (Google, GitHub) |
| GET | `/auth/oauth/{provider}/callback/` | OAuth callback |

### Users

| Method | Endpoint | Description |
|---|---|---|
| GET | `/users/me/` | Current user profile |
| PATCH | `/users/me/` | Update profile |
| POST | `/users/me/avatar/` | Upload avatar |
| GET | `/users/{username}/` | Public profile |
| GET | `/users/{username}/prompts/` | User's public prompts |
| GET | `/users/{username}/collections/` | User's collections |
| POST | `/users/{username}/follow/` | Follow a user |
| DELETE | `/users/{username}/follow/` | Unfollow |
| GET | `/users/{username}/followers/` | Follower list |
| GET | `/users/{username}/following/` | Following list |

### Prompts

| Method | Endpoint | Description |
|---|---|---|
| GET | `/prompts/` | Feed (paginated, filterable) |
| POST | `/prompts/` | Create a prompt |
| GET | `/prompts/{id}/` | Get single prompt |
| PATCH | `/prompts/{id}/` | Edit prompt (author only) |
| DELETE | `/prompts/{id}/` | Delete prompt (author or staff) |
| POST | `/prompts/{id}/rate/` | Submit or update a rating |
| DELETE | `/prompts/{id}/rate/` | Remove your rating |
| POST | `/prompts/{id}/copy/` | Log a copy event |
| POST | `/prompts/{id}/fork/` | Fork (remix) a prompt |
| POST | `/prompts/{id}/report/` | Report a prompt |
| GET | `/prompts/{id}/comments/` | List comments |
| POST | `/prompts/{id}/comments/` | Post a comment |

### Feed

| Method | Endpoint | Description | Query params |
|---|---|---|---|
| GET | `/feed/` | Personalised feed for logged-in user | `page`, `type`, `sort` |
| GET | `/feed/explore/` | Public explore (not personalised) | `page`, `type`, `category`, `tag`, `sort` |
| GET | `/feed/trending/` | Trending prompts (last 24h/7d/30d) | `period` |
| GET | `/feed/following/` | Feed from users you follow | `page` |

### Collections

| Method | Endpoint | Description |
|---|---|---|
| GET | `/collections/` | Your collections |
| POST | `/collections/` | Create collection |
| GET | `/collections/{id}/` | Get collection |
| PATCH | `/collections/{id}/` | Update collection |
| DELETE | `/collections/{id}/` | Delete collection |
| POST | `/collections/{id}/items/` | Add prompt to collection |
| DELETE | `/collections/{id}/items/{prompt_id}/` | Remove from collection |

### Search

| Method | Endpoint | Description |
|---|---|---|
| GET | `/search/?q={query}` | Full-text search across prompts, users, tags |
| GET | `/tags/trending/` | Top tags (for Right Sidebar) |
| GET | `/categories/` | All categories with prompt counts |
| GET | `/users/top/` | Top prompters leaderboard |

### Notifications

| Method | Endpoint | Description |
|---|---|---|
| GET | `/notifications/` | List notifications (paginated) |
| POST | `/notifications/mark-read/` | Mark one or all as read |
| DELETE | `/notifications/{id}/` | Delete notification |

### Comments

| Method | Endpoint | Description |
|---|---|---|
| PATCH | `/comments/{id}/` | Edit comment |
| DELETE | `/comments/{id}/` | Delete comment |
| POST | `/comments/{id}/like/` | Like a comment |
| DELETE | `/comments/{id}/like/` | Unlike |
| POST | `/comments/{id}/report/` | Report comment |

---

## 7. Milestone Roadmap

Each milestone is a shippable unit. Complete one fully before starting the next. No cutting corners on security gates.

---

### Milestone 0 — Foundation (Week 1–2)

**Goal:** Development environment is fully reproducible. Every dev can run everything locally.

**Tasks:**
- [ ] Set up monorepo: `frontend/` (existing React) and `backend/` (new Django project)
- [ ] `docker-compose.yml` with services: `postgres`, `redis`, `backend`, `frontend`
- [ ] PostgreSQL schema migrations (Alembic or Django migrations) for all tables in §3
- [ ] `.env.example` with all variables documented (see §13)
- [ ] Pre-commit hooks: `eslint`, `prettier`, `black`, `isort`, `flake8`
- [ ] GitHub Actions CI: lint + test on every PR
- [ ] Add `react-router-dom`, `@tanstack/react-query`, `axios`, `socket.io-client` to `package.json`
- [ ] Fix the `CopyButton` bug (`.finally` → `.then`)
- [ ] Wrap `App.jsx` in a React Error Boundary
- [ ] Add Vite proxy: `'/api': 'http://localhost:8000'` in `vite.config.js`

**Deliverable:** `docker-compose up` → working React app + Django API skeleton + PostgreSQL with schema.

---

### Milestone 1 — Auth (Week 3–4)

**Goal:** Real users can register, verify email, log in, and stay logged in.

**Tasks:**
- [ ] Django: `POST /auth/register/` with email + username + password (argon2-cffi hashing)
- [ ] Django: email verification flow — send link, verify token
- [ ] Django: `POST /auth/login/` → return JWT (15 min) in response body + refresh token in HttpOnly cookie
- [ ] Django: `POST /auth/refresh/` → validate cookie, issue new JWT
- [ ] Django: `POST /auth/logout/` → revoke refresh token in DB
- [ ] Django: password reset flow
- [ ] Django: Google OAuth 2.0 (use `social-auth-app-django`)
- [ ] Frontend: `AuthContext` with `user`, `login()`, `logout()`, `refreshToken()`
- [ ] Frontend: Login page, Register page, Forgot Password page
- [ ] Frontend: Protected routes (redirect to login if not authenticated)
- [ ] Frontend: Token refresh interceptor in Axios — auto-refresh on 401
- [ ] Replace hardcoded `AJ` / `Alex Johnson` in Navbar and LeftSidebar with real user data
- [ ] Rate limiting: 5 failed logins per 15 min per IP (Redis-backed)

**Security gate:** Penetration test the auth endpoints before proceeding. Test: brute force, token theft, CSRF, session fixation.

---

### Milestone 2 — Prompts CRUD (Week 5–6)

**Goal:** Authenticated users can create, read, update, delete prompts. The feed shows real data from the database.

**Tasks:**
- [ ] Django: full CRUD for prompts (`/api/v1/prompts/`)
- [ ] Django: image upload for cover image → validate → resize → upload to S3 → store URL in DB
- [ ] Django: `POST /prompts/{id}/copy/` — log the copy event, increment `copy_count`
- [ ] Django: `POST /prompts/{id}/rate/` — upsert rating, trigger fires to update `average_rating`
- [ ] Frontend: delete `src/data/prompts.js`
- [ ] Frontend: replace all static data in `Feed.jsx` with `useQuery` calls to `/api/v1/feed/explore/`
- [ ] Frontend: replace static data in `RightSidebar.jsx` with API calls to `/tags/trending/`, `/users/top/`, `/categories/`
- [ ] Frontend: fix `useRating.js` — uncomment and wire the `fetch` call
- [ ] Frontend: "Share a Prompt" button opens a modal with a real form
- [ ] Frontend: skeleton loaders for Feed, TextCard, ImageCard
- [ ] Frontend: infinite scroll pagination (Intersection Observer)
- [ ] Frontend: `Navbar` search bar → routes to `/search?q=...`

**Deliverable:** Live app with real database-driven prompts. No static data anywhere.

---

### Milestone 3 — Social Graph (Week 7–8)

**Goal:** Users can follow each other. The feed shows prompts from followed users.

**Tasks:**
- [ ] Django: Follow/Unfollow endpoints
- [ ] Django: Follower/Following list endpoints
- [ ] Django: `GET /feed/following/` — only prompts from users the current user follows
- [ ] Django: Reputation score computation — cron job recalculates `reputation_score` hourly based on received ratings × weights
- [ ] Frontend: Profile pages (`/u/{username}`)
- [ ] Frontend: Follow button with optimistic update
- [ ] Frontend: Followers / Following modal
- [ ] Frontend: "Following" tab in Feed
- [ ] Frontend: LeftSidebar shows real reputation score from API

---

### Milestone 4 — Comments & Collections (Week 9–10)

**Goal:** Users can discuss prompts and curate their own collections.

**Tasks:**
- [ ] Django: Comments CRUD + nested replies + likes
- [ ] Django: Collections CRUD + add/remove prompts
- [ ] Django: Bookmarks endpoint
- [ ] Frontend: Comment section on prompt detail page
- [ ] Frontend: Threaded comment display (2 levels deep max in UI)
- [ ] Frontend: My Prompts page (`/me/prompts`)
- [ ] Frontend: Collections pages (`/me/collections`, `/collections/{id}`)
- [ ] Frontend: Starred Prompts page (bookmarks)
- [ ] Frontend: Fork (remix) a prompt — opens edit form pre-filled with original

---

### Milestone 5 — Real-Time & Notifications (Week 11–12)

**Goal:** Users see notifications and rating updates without refreshing.

**Tasks:**
- [ ] Django Channels: WebSocket server
- [ ] Redis pub/sub: backend publishes events → Channels consumer pushes to client
- [ ] Events: new comment on your prompt, someone follows you, someone rates your prompt, prompt featured
- [ ] Django: Notifications table fully wired — every relevant action creates a notification row
- [ ] Django: `GET /notifications/` and `POST /notifications/mark-read/`
- [ ] Frontend: WebSocket connection in `AuthContext` (connect on login, disconnect on logout)
- [ ] Frontend: Notifications dropdown in Navbar (badge with unread count)
- [ ] Frontend: Notification list page
- [ ] Frontend: Live rating updates — when someone rates a prompt you're viewing, the count updates without refresh

---

### Milestone 6 — Search & Discovery (Week 13)

**Goal:** Users can find any prompt or user.

**Tasks:**
- [ ] PostgreSQL full-text search index already created in §3 schema
- [ ] Django: `GET /search/?q=` endpoint with ranking by ts_rank + rating
- [ ] Django: Search results paged, filtered by type/category/tag
- [ ] Frontend: Search results page with type filters
- [ ] Frontend: Tag pages (`/tag/{slug}`)
- [ ] Frontend: Category pages (`/category/{slug}`)
- [ ] Frontend: Trending page

---

### Milestone 7 — Content Moderation (Week 14)

**Goal:** The platform is safe to open to the public.

**Tasks:**
- [ ] Django: Report endpoint for prompts, comments, and users
- [ ] Django admin: Moderation queue — shows pending reports, one-click remove/dismiss
- [ ] Integrate **Hive Moderation API** or **AWS Rekognition** for automatic image scanning on upload
- [ ] Integrate **OpenAI Moderation API** (free) for automatic text scanning on prompt submission
- [ ] Django: Ban user endpoint (staff only) — sets `is_banned = True`, invalidates all refresh tokens
- [ ] Django: Auto-flag prompts that score above threshold on moderation API
- [ ] Frontend: Report button on every TextCard and ImageCard
- [ ] Frontend: Banned user sees a clear message on login

---

### Milestone 8 — Production Infrastructure (Week 15–16)

**Goal:** The app is deployed, monitored, and can handle real traffic.

**Tasks:**
- [ ] Provision: PostgreSQL RDS (Multi-AZ), ElastiCache Redis (cluster mode)
- [ ] Provision: ECS Fargate for Django (auto-scaling), S3 + CloudFront for media
- [ ] Cloudflare: DNS, CDN, WAF rules (block SQLi, XSS patterns), rate limiting at edge
- [ ] Replace Unsplash image hotlinks with real S3/CloudFront URLs
- [ ] Sentry: error tracking for both frontend and backend
- [ ] Datadog or CloudWatch: metrics, dashboards, alerts (API latency, error rate, DB connections)
- [ ] Set up staging environment (identical to prod, separate data)
- [ ] Load testing: use `locust` to simulate 10,000 concurrent users before launch
- [ ] Enable PostgreSQL connection pooling: PgBouncer
- [ ] Backup strategy: daily RDS snapshots, tested restore procedure
- [ ] SSL certificates via AWS ACM (auto-renew)
- [ ] HSTS preload submission

---

## 8. Frontend Migration Plan

### Routing (add immediately)

```jsx
// src/main.jsx — update to:
import { BrowserRouter, Routes, Route } from 'react-router-dom'

<BrowserRouter>
  <Routes>
    <Route path="/" element={<App />}>
      <Route index element={<Feed />} />
      <Route path="explore" element={<Explore />} />
      <Route path="trending" element={<Trending />} />
      <Route path="p/:slug" element={<PromptDetail />} />
      <Route path="u/:username" element={<UserProfile />} />
      <Route path="tag/:slug" element={<TagPage />} />
      <Route path="category/:slug" element={<CategoryPage />} />
      <Route path="search" element={<SearchResults />} />
      <Route path="me/prompts" element={<Protected><MyPrompts /></Protected>} />
      <Route path="me/collections" element={<Protected><Collections /></Protected>} />
      <Route path="me/starred" element={<Protected><Starred /></Protected>} />
      <Route path="notifications" element={<Protected><Notifications /></Protected>} />
      <Route path="settings" element={<Protected><Settings /></Protected>} />
    </Route>
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />
    <Route path="/forgot-password" element={<ForgotPassword />} />
  </Routes>
</BrowserRouter>
```

### Data fetching pattern

Use `@tanstack/react-query` throughout. Never call `fetch` directly in components.

```jsx
// Example: replacing static data in Feed.jsx
import { useInfiniteQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

function Feed() {
  const { data, fetchNextPage, hasNextPage, isLoading } =
    useInfiniteQuery({
      queryKey: ['feed', 'explore', activeTab, sortedByRating],
      queryFn: ({ pageParam = 1 }) =>
        api.get('/feed/explore/', {
          params: { page: pageParam, type: activeTab.toLowerCase(), sort: sortedByRating ? 'rating' : 'new' }
        }),
      getNextPageParam: (last) => last.data.next ? last.data.page + 1 : undefined,
    })
  // ...
}
```

### State management

- Server state: `@tanstack/react-query` (prompts, feed, user data)
- Auth state: `AuthContext` (current user, tokens)
- UI state: local `useState` within components (tabs, modals, search input)
- DO NOT use Redux or Zustand unless a clear need arises.

---

## 9. Real-Time & WebSocket Layer

### Events the server pushes to the client

| Event | Payload | When triggered |
|---|---|---|
| `notification.new` | `{ id, type, message, actor, prompt }` | Any notification created for this user |
| `prompt.rating_update` | `{ promptId, newAvg, newCount }` | Rating submitted on a prompt the client has open |
| `comment.new` | `{ promptId, comment }` | New comment on a prompt the client is viewing |
| `user.reputation_update` | `{ newScore }` | After reputation score recompute |

### Connection lifecycle

```js
// frontend: src/lib/socket.js
import { io } from 'socket.io-client'

let socket = null

export function connectSocket(accessToken) {
  socket = io(import.meta.env.VITE_WS_URL, {
    auth: { token: accessToken },
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10,
  })
  return socket
}

export function disconnectSocket() {
  socket?.disconnect()
  socket = null
}

export function getSocket() {
  return socket
}
```

Django Channels authenticates the WebSocket handshake using the JWT in the `auth` payload. Unauthenticated connections are dropped immediately.

---

## 10. Infrastructure & DevOps

### Docker Compose (local dev)

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: promptatlas
      POSTGRES_USER: pa_user
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  backend:
    build: ./backend
    command: python manage.py runserver 0.0.0.0:8000
    volumes:
      - ./backend:/app
    env_file: .env
    depends_on:
      - postgres
      - redis
    ports:
      - "8000:8000"

  frontend:
    build: ./frontend
    command: npm run dev
    volumes:
      - ./frontend:/app
      - /app/node_modules
    ports:
      - "5173:5173"

volumes:
  pgdata:
```

### CI/CD (GitHub Actions)

```
on: push to main → run tests → build Docker image → push to ECR → deploy to ECS (rolling update)
on: PR → run lint + tests only
```

### Deployment checklist before going live

- [ ] `DEBUG=False` in Django settings
- [ ] `ALLOWED_HOSTS` set to exact domain
- [ ] `SECRET_KEY` rotated and stored in Secrets Manager
- [ ] Database is NOT publicly accessible (VPC private subnet)
- [ ] S3 bucket has `Block all public access` enabled (served through CloudFront only)
- [ ] CloudFront signed URLs or signed cookies for private media
- [ ] All `.env` files are in `.gitignore`
- [ ] Sentry DSN configured
- [ ] CORS: `ALLOWED_ORIGINS` lists only your actual frontend domain
- [ ] `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` header active

---

## 11. Content Moderation

### Three layers

**Layer 1 — Automated (on submit):**
- Text prompts: send body + title to OpenAI Moderation API (`/v1/moderations`). If flagged, auto-reject with a user-friendly message.
- Image uploads: scan with AWS Rekognition `DetectModerationLabels`. If confidence > 80% on any NSFW label, reject.
- Result: flagged content never reaches the database.

**Layer 2 — Community reporting:**
- Every prompt and comment has a "Report" button
- Reports go to the `reports` table
- Staff see a queue in the Django admin ordered by `created_at ASC` (oldest first)
- Target: review within 24 hours

**Layer 3 — Staff action:**
- Remove prompt: sets `is_removed = True`, prompt disappears from all feeds
- Ban user: sets `is_banned = True`, all their refresh tokens are revoked (immediate logout)
- Log every staff action with `reviewed_by` and `action_taken`

---

## 12. Testing Strategy

### Backend (Django)

- Unit tests for every service function (rating computation, reputation score, follow/unfollow counts)
- Integration tests for every API endpoint using `pytest` + `factory_boy` for fixtures
- Auth flow tests: register → verify → login → refresh → logout
- Security tests: SQL injection attempts, CSRF token missing, JWT with wrong key, expired token

### Frontend (React)

- Unit tests for hooks: `useRating` (test that it calls the API, test optimistic update)
- Component tests with `@testing-library/react`: TextCard, ImageCard, Feed tabs
- E2E tests with Playwright: register → login → create prompt → rate prompt → logout

### Targets

| Layer | Coverage target |
|---|---|
| Backend unit | 80% |
| Backend integration | All API endpoints |
| Frontend unit | Core hooks and utilities |
| E2E | 5 critical user journeys |

---

## 13. Environment Variables Reference

```bash
# .env (never commit this file)

# Django
SECRET_KEY=your-very-long-random-secret-key-here
DEBUG=False
ALLOWED_HOSTS=promptatlas.com,api.promptatlas.com
DATABASE_URL=postgresql://pa_user:password@localhost:5432/promptatlas

# Redis
REDIS_URL=redis://localhost:6379/0

# JWT
JWT_PRIVATE_KEY_PATH=/etc/secrets/jwt_private.pem
JWT_PUBLIC_KEY_PATH=/etc/secrets/jwt_public.pem
JWT_ACCESS_TOKEN_EXPIRY_MINUTES=15
JWT_REFRESH_TOKEN_EXPIRY_DAYS=30

# AWS
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET_NAME=promptatlas-media
AWS_CLOUDFRONT_DOMAIN=cdn.promptatlas.com
AWS_REGION=us-east-1

# OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Email
EMAIL_HOST=smtp.ses.amazonaws.com
EMAIL_PORT=587
EMAIL_HOST_USER=
EMAIL_HOST_PASSWORD=
DEFAULT_FROM_EMAIL=noreply@promptatlas.com

# Content Moderation
OPENAI_API_KEY=          # for moderation API (free tier available)
HIVE_API_KEY=            # optional, for advanced image moderation

# Monitoring
SENTRY_DSN=

# Frontend (prefix with VITE_ so Vite exposes them)
VITE_API_BASE_URL=https://api.promptatlas.com/api/v1
VITE_WS_URL=wss://api.promptatlas.com
```

---

## Final Notes

The existing React UI is a solid, well-designed prototype. The design system (dark theme, accent colour, CSS tokens) is production-quality and should not be changed — only extended. The component structure is clean.

The gaps are entirely on the data and infrastructure side: there is no backend, no auth, no real data, and no persistence. This document closes every one of those gaps.

Follow the milestones in order. Do not start Milestone 2 without Milestone 1's auth being security-reviewed. Do not go to production without Milestone 7's moderation in place — you will be liable for unmoderated content on day one.

Build it right. Ship it solid.