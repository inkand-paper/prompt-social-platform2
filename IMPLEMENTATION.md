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

---

---

# UPDATE — May 30, 2025

> **Status review performed by:** Senior audit  
> **Current date:** May 30, 2025  
> **Repo cloned fresh, every file read, every line verified.**

---

## What You've Actually Built (Honest Assessment)

First — you've done a solid amount of real work since the original plan. Here's exactly where things stand:

### ✅ Done and correct

| Item | File | Quality |
|---|---|---|
| React Router v7 routing | `main.jsx` | Perfect. All routes from §8 of the plan are wired. |
| React Query (TanStack v5) setup | `main.jsx` | Correct config, staleTime, gcTime. |
| Axios instance with JWT interceptor | `src/lib/api.js` | Production-grade. Token refresh queue is correct. |
| AuthContext with mock/prod toggle | `src/context/AuthContext.jsx` | Clean pattern. Easy to swap when backend is live. |
| Socket.io client | `src/lib/socket.js` | Correct. Reconnect logic in place. |
| Feed API with mock/prod toggle | `src/lib/feedApi.js` | `MOCK_MODE` flag is exactly right. `normalizePrompt()` is good. |
| `useFeed` + `useTrending` hooks | `src/hooks/useFeed.js` | Infinite query wired correctly. |
| Login page with form validation | `src/pages/LoginPage.jsx` | Solid. `react-hook-form` used properly. |
| Register page | `src/pages/RegisterPage.jsx` | Good. Password confirm validation works. |
| Share Prompt modal | `src/components/SharePromptModal.jsx` | Full form with type, model, visibility, body, description. |
| Error boundary | `src/components/ErrorBoundary.jsx` | Correct class component. Sentry hook point is there. |
| Skeleton loaders | `src/components/SkeletonCard.jsx` | Both text + image variants. |
| All page stubs created | `src/pages/` | 10 pages exist as stubs. |
| Vite dev proxy | `vite.config.js` | `/api` → `localhost:8000`. Correct. |
| Dependencies added | `package.json` | All 5 new packages correctly added. |
| `.env` in `.gitignore` | `.gitignore` | Confirmed. |

### ⚠️ Still mock / not yet wired

| Item | Where | What's needed |
|---|---|---|
| `AuthContext.login()` | `AuthContext.jsx:L33` | Comment out mock block, uncomment the real `api.post('/auth/login/')` |
| `AuthContext.register()` | `AuthContext.jsx:L55` | Same — remove mock, wire real call |
| `feedApi.js MOCK_MODE` | `feedApi.js:L14` | Set `MOCK_MODE = false` when Django is live |
| `SharePromptModal` submit | `SharePromptModal.jsx:L32` | Uncomment real `api.post('/prompts/', data)` |
| `src/data/prompts.js` | `src/data/prompts.js` | Still exists, still used. Delete ONLY after backend returns real data. |
| All 10 page stubs | `src/pages/` | Pages exist as files but content is placeholder |
| BoltRating persistence | `src/hooks/useRating.js` | TODO still present, rating doesn't persist |

### 🔴 Backend: zero code exists

There is no `backend/` folder in this repo. No Django project. No database. No API. Everything the frontend calls right now hits the mock data layer and never touches a real server.

---

## To Answer Your Questions Directly

### "Is this just a backend and mock UI for now?"

**It's a mock UI only. There is no backend at all yet.** What you have is:

- A fully structured, professionally wired React frontend
- With a smart mock layer that simulates the backend using local data
- Every API call is already written — it just hits fake data instead of a real server
- The moment you set `MOCK_MODE = false` and the Django backend is running, the entire frontend comes alive with zero other changes needed

This is actually the correct and smart way to build it. Frontend is done enough to be useful. Now the backend needs to exist.

### "Should I host it before building the frontend?"

**No. Do not host yet.** Here's why, precisely:

The frontend currently runs on `src/data/prompts.js` (6 text prompts, 6 image prompts, all hardcoded). If you host this today:
- Users can browse but cannot register (mock auth only stores in `sessionStorage`, which clears on tab close)
- No prompt they submit is saved anywhere
- No rating they click persists
- Refresh loses everything

Hosting mock data publicly wastes your time and sets false expectations. **Build the Django backend to Milestone 1 (Auth) and Milestone 2 (Prompts CRUD) first, then host the combined system.**

---

## What's Next — Revised Milestone Plan

The original milestones in this document remain valid and correct. What changes is the **priority order** now that the frontend mock layer is complete.

---

### CURRENT STATE: Frontend is at ~Milestone 2.5 (mock)

All the frontend work planned in Milestones 0–4 of the original plan is done in mock form. The switches are all built in. Now the work is purely backend.

---

### Next Step: Milestone B1 — Django Project Setup (Week 1, starting now)

**Goal:** A working Django project exists, connects to PostgreSQL, and serves the health check endpoint. The frontend proxy can reach it.

**Tasks — do these in exact order:**

1. Create `backend/` folder at the root of this repo
2. `pip install django djangorestframework django-cors-headers psycopg2-binary argon2-cffi djangorestframework-simplejwt python-dotenv`
3. `django-admin startproject config backend/`
4. Create apps: `python manage.py startapp accounts` and `python manage.py startapp prompts`
5. Apply the full PostgreSQL schema from §3 of this document as Django models (not raw SQL — use the ORM so migrations work)
6. Configure `INSTALLED_APPS`, `DATABASES` (PostgreSQL), `CORS_ALLOWED_ORIGINS` (allow `http://localhost:5173` in dev)
7. Add `GET /api/v1/health/` endpoint — returns `{ "status": "ok", "version": "1.0.0" }`
8. Confirm: `npm run dev` in `frontend/` + `python manage.py runserver` in `backend/` + Vite proxy routes `/api` → Django → returns health JSON

**Deliverable:** Both servers running locally. `curl http://localhost:5173/api/v1/health/` returns `{"status":"ok"}`.

---

### Milestone B2 — Auth API (Week 2)

**Goal:** Real users can register and log in. The frontend mock blocks are swapped for real API calls.

**Django tasks:**
1. Custom `User` model extending `AbstractBaseUser` — implements every column from §3.1
2. `POST /api/v1/auth/register/` — validate, argon2 hash password, create user, send verification email (use Django's email backend, SMTP or console backend in dev)
3. `POST /api/v1/auth/login/` — verify password, issue JWT access token (15 min, RS256) + set HttpOnly refresh token cookie
4. `POST /api/v1/auth/refresh/` — validate cookie, issue new access token
5. `POST /api/v1/auth/logout/` — revoke refresh token row in DB
6. `GET /api/v1/users/me/` — return current user profile

**Frontend tasks (after Django endpoints are live):**
1. In `src/context/AuthContext.jsx`: comment out the MOCK block in `login()`, uncomment the real `api.post('/auth/login/', ...)` call. Do the same for `register()`.
2. In `src/lib/feedApi.js`: keep `MOCK_MODE = true` for now — the prompts API isn't built yet
3. Test: register → get verification email → verify → login → JWT issued → `/users/me/` returns user → Navbar shows real name

**Deliverable:** Real auth works end to end. Mock user `MOCK_USER` in AuthContext is no longer used.

---

### Milestone B3 — Prompts API (Week 3)

**Goal:** Real prompts are stored in PostgreSQL and served to the frontend. `src/data/prompts.js` is deleted.

**Django tasks:**
1. `Prompt`, `Category`, `Tag`, `PromptCategory`, `PromptTag` models and migrations
2. `GET /api/v1/feed/explore/` — paginated, filterable by type, sortable
3. `POST /api/v1/prompts/` — create a prompt (auth required)
4. `GET /api/v1/prompts/{id}/` — single prompt detail
5. `POST /api/v1/prompts/{id}/copy/` — log copy event, increment counter
6. `GET /api/v1/tags/trending/` — top 8 tags by usage_count
7. `GET /api/v1/users/top/` — top 4 users by reputation_score
8. `GET /api/v1/categories/` — all categories with counts

**Frontend tasks:**
1. Set `MOCK_MODE = false` in `src/lib/feedApi.js`
2. Delete `src/data/prompts.js`
3. Remove the `import { TEXT_PROMPTS, IMAGE_PROMPTS }` from `feedApi.js` (they'll be gone)
4. Seed the database with at least 20 real prompts so the feed isn't empty

**Deliverable:** Live database-driven feed. No static data anywhere. RightSidebar shows real tags/prompters/categories from DB.

---

### Milestone B4 — Ratings + Comments (Week 4)

**Goal:** Ratings persist. Comments work.

**Django tasks:**
1. `Rating` model + `POST /api/v1/prompts/{id}/rate/` — upsert, trigger recomputes average
2. `Comment` model + CRUD endpoints for comments
3. `CommentLike` model + like/unlike endpoints

**Frontend tasks:**
1. Fix `src/hooks/useRating.js` — uncomment the `fetch` call, change it to `api.post()` from the Axios instance
2. Build out `PromptDetailPage.jsx` — full prompt view with comment section
3. Wire `CommentSection.jsx` component to the comments API

**Deliverable:** Clicking a bolt rating saves to DB. Comments appear and persist.

---

### Milestone B5 — Social Graph + Notifications (Week 5)

Implement follows, collections, bookmarks, and the notifications table. Wire the WebSocket server using Django Channels. This maps to Milestones 3 and 5 from the original plan — they are unchanged, just deferred until here.

---

### Milestone B6 — Hosting (Week 6)

**Only after B1–B5 are complete.** At that point:

**Frontend hosting:** Deploy to **Vercel** (free tier, zero config for Vite/React). Point `VITE_API_BASE_URL` to your backend URL.

**Backend hosting:** Deploy Django to **Railway** or **Render** (both have free PostgreSQL tiers for early stage). Much simpler than AWS for a first deployment.

**Why not AWS yet?** AWS (ECS, RDS, ElastiCache, CloudFront) from §10 of the original plan is correct for production scale. But for your first real deployment, Railway or Render gets you live in 30 minutes with zero DevOps overhead. Migrate to AWS when you have real users.

**Media (images/avatars):** Use **Cloudflare R2** (S3-compatible, free tier is generous, no egress fees). Replace Unsplash hotlinks with R2 URLs at this point.

**Domain:** Point your domain to Vercel (frontend) and Railway/Render (backend). Enable Cloudflare as proxy for DDoS protection and free SSL.

**Deliverable:** Public URL, real database, real auth, real prompts. Tell people.

---

### Milestone B7 — Production Infrastructure (Later)

This is the AWS migration from §10 of the original plan. Do this when you have 1,000+ real users and need the scale. Not before. Premature AWS architecture costs money and time with no benefit at early stage.

---

## The One File to Change Next

Before touching Django, do this in the frontend right now:

In `src/components/CopyButton.jsx`, change `.finally` to `.then`:

```js
// CURRENT (buggy — shows "Copied!" even on permission denied):
navigator.clipboard.writeText(text).finally(() => {
  setCopied(true)
  ...
})

// CORRECT:
navigator.clipboard.writeText(text).then(() => {
  setCopied(true)
  setTimeout(() => setCopied(false), 1800)
}).catch(() => {
  // silently fail — don't show "Copied!" if it didn't work
})
```

This is the only remaining bug in the frontend. Everything else is either intentionally mocked or correctly structured.

---

## Summary

| Layer | Status | Next action |
|---|---|---|
| Frontend structure | ✅ Complete | No changes needed |
| Frontend routing | ✅ Complete | No changes needed |
| Frontend auth flow | ✅ Mocked, wired | Swap mock for real once B2 is done |
| Frontend feed | ✅ Mocked, wired | Flip `MOCK_MODE=false` once B3 is done |
| Frontend pages | ⚠️ Stubs only | Build out each page as backend endpoints land |
| Backend | 🔴 Does not exist | Start Milestone B1 today |
| Database | 🔴 Does not exist | Created as part of B1 |
| Hosting | 🔴 Not yet | Do after B1–B5 |
| Production infra (AWS) | 🔴 Not yet | Do after real users |

**Start here → create `backend/` → `django-admin startproject config backend/` → get that health endpoint running.**


---

---

# UPDATE — May 30, 2026

> **Full repo re-cloned and every file read line by line.**  
> This supersedes the May 30, 2025 update where relevant. Previous content is preserved above.

---

## Complete Audit — Where Things Stand Right Now

Massive progress since last update. A real Django backend now exists. Here is the exact, honest state of every file.

---

### Backend — What's Built

| File | Status | Notes |
|---|---|---|
| `backend/config/settings.py` | ⚠️ Issues | SQLite in use, not PostgreSQL. `SECRET_KEY` hardcoded in plain text. `CORS_ALLOW_ALL_ORIGINS = True`. JWT using HS256, not RS256. All four of these must be fixed before any hosting. |
| `backend/config/urls.py` | ✅ Good | Health check + auth + prompts routes all wired. |
| `backend/config/views.py` | ✅ Good | Health check endpoint works and returns correct shape. |
| `backend/accounts/models.py` | ✅ Excellent | Full `User` model with UUID PK, all fields from schema. `OAuthProvider`, `Follow` models present. |
| `backend/accounts/serializers.py` | ✅ Good | `UserSerializer` and `RegisterSerializer` correct. |
| `backend/accounts/views.py` | ⚠️ One bug | `FollowUserView.post()` handles both follow and unfollow in the same POST — it toggles. The `unfollowUser()` in `userApi.js` calls `api.delete(...)` but **there is no DELETE handler** on `FollowUserView`. The delete call will return 405. |
| `backend/accounts/urls.py` | ⚠️ Typo | `user_prmpts` — missing 'o'. Not a runtime bug but unprofessional. Fix it. |
| `backend/prompts/models.py` | ✅ Excellent | Every model from §3 is implemented: `Prompt`, `Category`, `Tag`, `Rating`, `Comment`, `Collection`, `CollectionItem`, `Bookmark`, `Notification`, `PromptCopy`, `PromptView`. All relations correct. |
| `backend/prompts/serializers.py` | ✅ Good | All serializers present. `PromptSerializer` nests author + categories + tags correctly. |
| `backend/prompts/views.py` | ⚠️ Issues | See detailed bugs below. |
| `backend/prompts/urls.py` | ⚠️ Route conflict | `<slug:slug>/` and `<uuid:pk>/copy/` both exist. Django resolves top-down — a UUID like `3f2a...` will attempt to match `<slug:slug>` first and fail with 404 before reaching the UUID routes. The UUID routes must come before the slug route. |
| `backend/db.sqlite3` | 🔴 Must fix | SQLite file is committed to the repo. It must be in `.gitignore`. SQLite cannot be used in production — it doesn't support concurrent writes. Switch to PostgreSQL. |
| `backend/seed_data.py` | ✅ Good | Exists, creates categories, tags, prompts. Run this after switching to PostgreSQL. |
| `backend/accounts/migrations/0001_initial.py` | ✅ Good | Migration was generated on 2026-05-30. Correct. |

---

### Detailed Backend Bugs

#### Bug 1 — SQLite instead of PostgreSQL (settings.py line 84)
```python
# CURRENT — wrong:
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# FIX:
import os
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DB_NAME', 'promptatlas'),
        'USER': os.environ.get('DB_USER', 'pa_user'),
        'PASSWORD': os.environ.get('DB_PASSWORD', ''),
        'HOST': os.environ.get('DB_HOST', 'localhost'),
        'PORT': os.environ.get('DB_PORT', '5432'),
    }
}
```

#### Bug 2 — SECRET_KEY hardcoded (settings.py line 13)
```python
# CURRENT — wrong:
SECRET_KEY = 'django-insecure-ryc)au$&ioc#^a2)...'

# FIX:
import os
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY')
if not SECRET_KEY:
    raise ValueError("DJANGO_SECRET_KEY environment variable is not set")
```

#### Bug 3 — CORS wide open (settings.py line 60)
```python
# CURRENT — wrong for anything beyond localhost:
CORS_ALLOW_ALL_ORIGINS = True

# FIX:
CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',     # Vite dev server
    'http://localhost:4173',     # Vite preview
    # 'https://promptatlas.com', # add your real domain here
]
CORS_ALLOW_CREDENTIALS = True  # needed for the HttpOnly refresh cookie
```

#### Bug 4 — URL route conflict in prompts/urls.py
```python
# CURRENT — wrong order (slug catches UUIDs too):
path('<slug:slug>/', PromptDetailView.as_view(), ...),
path('<uuid:pk>/copy/', CopyEventView.as_view(), ...),   # never reached

# FIX — UUID routes must come first:
path('<uuid:pk>/copy/', CopyEventView.as_view(), ...),
path('<uuid:pk>/rate/', RatingCreateUpdateView.as_view(), ...),
path('<uuid:pk>/comments/', CommentListCreateView.as_view(), ...),
path('<slug:slug>/', PromptDetailView.as_view(), ...),   # last
```

#### Bug 5 — Follow/Unfollow: DELETE method missing (accounts/views.py)
The frontend calls `api.delete('/auth/profiles/{username}/follow/')` but `FollowUserView` only has a `post()` method. The POST already toggles, but the frontend sends a DELETE. Mismatch.

**Two options — pick one:**

Option A (keep toggle POST, fix frontend): Remove `unfollowUser()` from `userApi.js`. Make `followUser()` call POST always. The backend toggles. Return `{following: bool}` and the frontend reads it.

Option B (proper REST, add DELETE handler):
```python
class FollowUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, username):
        # Follow only
        try:
            target = User.objects.get(username=username)
            if target == request.user:
                return Response({"error": "Cannot follow yourself"}, status=400)
            _, created = Follow.objects.get_or_create(follower=request.user, following=target)
            if created:
                target.follower_count += 1
                request.user.following_count += 1
                target.save(); request.user.save()
            return Response({"following": True})
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=404)

    def delete(self, request, username):
        # Unfollow only
        try:
            target = User.objects.get(username=username)
            deleted, _ = Follow.objects.filter(follower=request.user, following=target).delete()
            if deleted:
                target.follower_count = max(0, target.follower_count - 1)
                request.user.following_count = max(0, request.user.following_count - 1)
                target.save(); request.user.save()
            return Response({"following": False})
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=404)
```

**Recommendation: Option B.** It's proper REST and the frontend is already wired for it.

#### Bug 6 — Rating view doesn't validate value range (prompts/views.py)
```python
# CURRENT — no validation:
defaults={'value': request.data.get('value')}

# FIX:
value = request.data.get('value')
try:
    value = float(value)
    if not (0.5 <= value <= 5.0):
        raise ValueError
except (TypeError, ValueError):
    return Response({"error": "Rating must be between 0.5 and 5.0"}, status=400)
```

#### Bug 7 — `db.sqlite3` committed to git
Add to `.gitignore`:
```
backend/db.sqlite3
backend/__pycache__/
backend/**/__pycache__/
backend/**/*.pyc
*.pyc
```

#### Bug 8 — `TrendingFeedView` is not actually trending
It just orders by average_rating. This is "top rated", not "trending". Trending should be based on recent activity (ratings + copies + views in the last 7 days). Fix this after the basics work — low priority for now, but label it correctly.

---

### Frontend — What's Changed Since Last Audit

| File | Status | Notes |
|---|---|---|
| `src/components/CopyButton.jsx` | ✅ Fixed | `.finally` bug corrected to `.then/.catch`. `onCopy` callback added. |
| `src/lib/userApi.js` | ✅ New | Full API lib: fetchUserProfile, follow, unfollow, notifications, bookmarks, search, comments, collections. `MOCK_MODE = false` — this is already pointing at the real backend. |
| `src/components/FollowButton.jsx` | ✅ New | Optimistic follow/unfollow with rollback on error. Auth-gated. |
| `src/components/ProtectedRoute.jsx` | ✅ New | Loading state prevents flash redirect. Stores `from` location for post-login redirect. |
| `src/pages/UserProfilePage.jsx` | ✅ New | Full profile hero, stats, tabs, prompts list. Loads real data from backend. |
| `src/pages/PromptDetailPage.jsx` | ✅ New | Full prompt detail: body, rating, copy, star, fork button (stub), comments. |
| `src/pages/NotificationsPage.jsx` | ✅ New | Fully wired: load, mark-one-read, mark-all-read. Optimistic UI. |
| `src/pages/SettingsPage.jsx` | ✅ New | Profile, Account, Notifications tabs. Avatar upload wired. Password change UI built (backend endpoint missing). |
| `src/pages/ExplorePage.jsx` | ⚠️ Thin | Just renders `<Feed />`. The category quick-filter bar (`QUICK_CATS`) is defined but never rendered. |
| `src/context/AuthContext.jsx` | ⚠️ Still mocked | `login()` and `register()` still use mock block. **Must be swapped to real API calls now that the backend auth endpoints exist.** |
| `src/lib/feedApi.js` | ⚠️ MOCK_MODE = true | Feed still reads from `src/data/prompts.js`. Must flip to `false` after fixing settings bugs 1–4. |
| `src/data/prompts.js` | ⚠️ Still exists | Still needed while MOCK_MODE is true. Delete after flip. |
| `src/hooks/useRating.js` | 🔴 Still broken | The `fetch` call is still a comment. The backend rating endpoint now exists. This must be wired. |

---

### Frontend Bugs Found

#### Bug 1 — `useRating.js` still has dead TODO (most critical)
```js
// CURRENT — rating never persists:
function handleClick(pos) {
    setRating(pos)
    setHoverRating(null)
    // TODO Django: fetch('/api/prompts/${id}/rate/', { method: 'POST', ...})
}

// FIX — wire to the real endpoint:
import api from '../lib/api'

function handleClick(pos) {
    setRating(pos)
    setHoverRating(null)
    if (promptId) {
        api.post(`/prompts/${promptId}/rate/`, { value: pos }).catch(() => {
            // rollback on failure
            setRating(initialRating)
        })
    }
}
```

#### Bug 2 — `userApi.js` has an inconsistency in `fetchPrompt`
```js
// This comment in userApi.js is a bug:
// "Actually, I should use normalizePrompt if I want consistency. But for now let's just return."
```
`PromptDetailPage.jsx` accesses `prompt.cat`, `prompt.avatarUrl`, `prompt.ratingCount` etc. — all camelCase normalized fields. But `fetchPrompt` returns raw snake_case from Django. `prompt.cat` will be `undefined`. The detail page will render broken. Fix: import `normalizePrompt` from `feedApi.js` and call it in `fetchPrompt`.

#### Bug 3 — `ExplorePage.jsx` has dead code
`QUICK_CATS` array is defined but never rendered. Either add the category filter bar UI or remove the array.

#### Bug 4 — `AuthContext.jsx` mock must be swapped NOW
The backend auth endpoints exist: `POST /api/v1/auth/register/`, `POST /api/v1/auth/login/`. The mock blocks in `login()` and `register()` must be replaced. However, note that `TokenObtainPairView` (Django SimpleJWT) returns `{ access, refresh }` not `{ access_token, user }`. The `AuthContext` code expects `data.access_token` and `data.user`. Either:
- Customize SimpleJWT's response to include the user object, or
- After getting the token, make a second call to `/auth/me/` to get the user

The cleanest fix is a custom `TokenObtainPairSerializer` that adds the user to the response.

#### Bug 5 — `SettingsPage.jsx` Account tab password change has no submit handler
The password change form has inputs but the "Update Password" button has no `onClick` and the form has no `onSubmit`. It does nothing. There is also no backend endpoint for password change. Both need to be built.

---

## Revised Status Table — Today

| Milestone | Original Plan | Status |
|---|---|---|
| M0 — Foundation | Project setup, deps, routing | ✅ Complete |
| M1 — Auth | Register, login, JWT, protected routes | ⚠️ Backend exists, frontend still mocked |
| M2 — Prompts CRUD | Create, read, feed, copy | ⚠️ Backend exists with bugs (URL order, SQLite, CORS) |
| M3 — Social Graph | Follows | ⚠️ Backend exists, DELETE bug |
| M4 — Comments & Collections | Comments, bookmarks, collections | ⚠️ Backend exists, not wired in all pages |
| M5 — Real-Time | WebSockets, notifications | ⚠️ Notification model + API exist, no WebSocket yet |
| M6 — Search | Full-text search | ✅ Backend endpoint exists (icontains, not FTS yet) |
| M7 — Moderation | Reports, content scanning | 🔴 Not started |
| M8 — Hosting | Deploy | 🔴 Not started |

---

## What To Do Right Now — Ordered by Priority

### Priority 1 — Fix the four settings bugs (do this today, takes 30 minutes)

1. Install PostgreSQL locally. Create database `promptatlas`.
2. Fix `settings.py`: env-var-based `SECRET_KEY`, PostgreSQL `DATABASES`, restrict `CORS_ALLOWED_ORIGINS`, add `db.sqlite3` to `.gitignore`.
3. `pip install psycopg2-binary python-dotenv`
4. Create `.env` in `backend/`:
   ```
   DJANGO_SECRET_KEY=generate-a-new-random-key-here
   DB_NAME=promptatlas
   DB_USER=pa_user
   DB_PASSWORD=your_password
   DB_HOST=localhost
   DB_PORT=5432
   ```
5. `python manage.py migrate` against PostgreSQL.
6. `python seed_data.py` to seed initial data.
7. `python manage.py runserver` — confirm health check responds.

### Priority 2 — Fix the URL route order in prompts/urls.py (10 minutes)

Move the UUID routes (`copy`, `rate`, `comments`) above the slug route. One reorder, no logic changes.

### Priority 3 — Fix the FollowUserView DELETE handler (20 minutes)

Add the `delete()` method to `FollowUserView` as shown in Bug 5 above.

### Priority 4 — Swap AuthContext mock for real API calls (30 minutes)

Write a custom `TokenObtainPairSerializer` in `accounts/serializers.py` that adds the user to the JWT response. Then uncomment the real calls in `AuthContext.jsx`.

### Priority 5 — Fix useRating.js (15 minutes)

Wire the `handleClick` to `api.post('/prompts/{id}/rate/', { value: pos })`. This makes ratings actually persist — currently the most visible broken feature.

### Priority 6 — Fix fetchPrompt to use normalizePrompt (15 minutes)

Import `normalizePrompt` from `feedApi.js` in `userApi.js`, call it on the response in `fetchPrompt()`. The detail page will then display correctly.

### Priority 7 — Flip MOCK_MODE to false, delete prompts.js

Only after Priority 1 is done (PostgreSQL running with seeded data). Set `MOCK_MODE = false` in `feedApi.js`. Delete `src/data/prompts.js`. The feed will now load from the real database.

---

## What Can Wait

- **WebSockets / real-time notifications** — Notification model + API exists. Django Channels can be added as Milestone B5, after the basics are working end-to-end.
- **Content moderation** — Do before opening to the public, not before internal testing.
- **AWS / production infra** — Railway + Render + Cloudflare R2 is the right first hosting. AWS later.
- **Password change endpoint** — UI exists, build the backend endpoint as part of the settings work.
- **Full-text search** — Current `icontains` search works fine for early stage. PostgreSQL `to_tsvector` / `SearchVector` can replace it when you have enough data that relevance ranking matters.
- **TrendingFeedView accuracy** — It shows top-rated, not truly trending. Fine for now. Annotate it properly after you have real user activity data.

---

## One Sentence Summary

The architecture is solid and nearly complete — you need to fix 4 settings bugs, reorder 3 URL patterns, add 1 DELETE method, swap 2 mock blocks for real API calls, and wire 1 rating hook, and the app will be fully functional end-to-end on a real PostgreSQL database.
