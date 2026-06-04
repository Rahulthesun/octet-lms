# C@O Admin Dashboard — Backend Reference
**Project:** Chemistry@OCTET | **Assignee:** Rahul | **Stack:** Express · Supabase PostgreSQL · Cloudflare R2

---

## 1. Project Structure

The API follows a 3-layer architecture. Every HTTP request flows through these layers in order:

```
Browser → server.js → routes/ → controllers/ → services/ → Supabase / R2 → back up → Browser
```

| Folder | Job |
|--------|-----|
| `server.js` | Entry point. Boots Express, registers middleware (cors, json parser), mounts all routers. Nothing else. |
| `routes/` | Maps a URL + HTTP method to a controller function. No logic, no DB. Just routing. |
| `controllers/` | Reads req, validates input, calls a service, sends res. Speaks HTTP. Does not touch the DB. |
| `services/` | All business logic and DB queries live here. Has no knowledge of HTTP. |
| `config/` | Supabase client and R2 client initialisation. Imported by services only. |

---

## 2. Database Structure (Supabase PostgreSQL)

Hierarchy:
```
Subject → Chapter → Subtopic → (PDFs | Videos)
```

`on delete cascade` is set on every foreign key — deleting a Subject removes all its children automatically.

### 2.1 subjects

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key, auto-generated |
| `name` | text | Required, unique |
| `description` | text | Optional |
| `order_index` | integer | Controls display order |
| `is_visible` | boolean | Default true |
| `created_at` | timestamptz | Auto-set |
| `updated_at` | timestamptz | Auto-set |

```sql
create table subjects (
  id          uuid default gen_random_uuid() primary key,
  name        text not null unique,
  description text,
  order_index integer default 0,
  is_visible  boolean default true,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
```

### 2.2 chapters

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `subject_id` | uuid | FK → subjects(id) on delete cascade |
| `name` | text | Required |
| `description` | text | Optional |
| `order_index` | integer | Controls display order within subject |
| `is_visible` | boolean | Default true |
| `created_at` | timestamptz | Auto-set |
| `updated_at` | timestamptz | Auto-set |

```sql
create table chapters (
  id          uuid default gen_random_uuid() primary key,
  subject_id  uuid references subjects(id) on delete cascade not null,
  name        text not null,
  description text,
  order_index integer default 0,
  is_visible  boolean default true,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
```

### 2.3 subtopics

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `chapter_id` | uuid | FK → chapters(id) on delete cascade |
| `name` | text | Required |
| `description` | text | Optional |
| `order_index` | integer | Controls display order within chapter |
| `is_visible` | boolean | Default true |
| `created_at` | timestamptz | Auto-set |
| `updated_at` | timestamptz | Auto-set |

```sql
create table subtopics (
  id          uuid default gen_random_uuid() primary key,
  chapter_id  uuid references chapters(id) on delete cascade not null,
  name        text not null,
  description text,
  order_index integer default 0,
  is_visible  boolean default true,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
```

### 2.4 pdfs

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `subtopic_id` | uuid | FK → subtopics(id) on delete cascade |
| `title` | text | Required |
| `filename` | text | Original file name |
| `r2_key` | text | Path inside R2 bucket. Unique. Used to generate signed URLs |
| `mime_type` | text | Default: application/pdf |
| `size_bytes` | bigint | File size in bytes |
| `uploaded_by` | uuid | FK → auth.users(id) |
| `is_visible` | boolean | Default true |
| `created_at` | timestamptz | Auto-set |
| `updated_at` | timestamptz | Auto-set |

```sql
create table pdfs (
  id          uuid default gen_random_uuid() primary key,
  subtopic_id uuid references subtopics(id) on delete cascade not null,
  title       text not null,
  filename    text not null,
  r2_key      text not null unique,
  mime_type   text default 'application/pdf',
  size_bytes  bigint,
  uploaded_by uuid references auth.users(id),
  is_visible  boolean default true,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
```

### 2.5 videos

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `subtopic_id` | uuid | FK → subtopics(id) on delete cascade |
| `title` | text | Required |
| `filename` | text | Original file name |
| `r2_key` | text | Path inside R2 bucket. Unique |
| `thumbnail_key` | text | R2 key for the thumbnail image |
| `mime_type` | text | Default: video/mp4 |
| `size_bytes` | bigint | File size in bytes |
| `duration_secs` | integer | Video length in seconds (from ffprobe) |
| `uploaded_by` | uuid | FK → auth.users(id) |
| `is_visible` | boolean | Default true |
| `created_at` | timestamptz | Auto-set |
| `updated_at` | timestamptz | Auto-set |

```sql
create table videos (
  id            uuid default gen_random_uuid() primary key,
  subtopic_id   uuid references subtopics(id) on delete cascade not null,
  title         text not null,
  filename      text not null,
  r2_key        text not null unique,
  thumbnail_key text,
  mime_type     text default 'video/mp4',
  size_bytes    bigint,
  duration_secs integer,
  uploaded_by   uuid references auth.users(id),
  is_visible    boolean default true,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
```

---

## 3. Storage Architecture

### 3.1 What goes where

| Data | Where | Why |
|------|-------|-----|
| PDF / Video files | Cloudflare R2 | Cheap egress, CDN, fast delivery |
| Thumbnails | Cloudflare R2 | Same bucket, thumbnail_key column |
| Metadata (title, size, etc.) | Supabase PostgreSQL | Queryable, filterable, relational |
| User auth | Supabase Auth | Built-in, JWT tokens |

### 3.2 What is r2_key?

`r2_key` is a plain text column in Supabase that stores the file's path inside your R2 bucket.

Example: `pdfs/2024/abc123-thermodynamics.pdf`

The actual file lives in R2. Supabase only remembers where it is.

When a student requests a PDF:
```
1. Fetch r2_key from Supabase
2. Use r2_key to generate a signed URL pointing to R2
3. Return the signed URL to the client
4. Client fetches the file directly from Cloudflare — never hits your Express server
```

If you ever change your R2 domain or bucket name, you update one config variable. Every `r2_key` in the DB stays valid.

---

## 4. API Endpoints

### 4.1 PDF Management — mounted at `/api/content/pdf`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/upload` | Upload a PDF file + save metadata |
| GET | `/` | List all PDFs (supports `?subtopicId=` filter) |
| GET | `/:id` | Get single PDF metadata + signed URL |
| PUT | `/:id` | Update PDF metadata (title, visibility, etc.) |
| DELETE | `/:id` | Delete metadata from Supabase + file from R2 |

### 4.2 Video Management — mounted at `/api/content/video`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/upload` | Upload video + thumbnail, save metadata |
| GET | `/` | List all videos |
| GET | `/:id` | Get video metadata + signed URL |
| GET | `/:id/stream` | Stream video with HTTP Range support (206) |
| PUT | `/:id` | Update metadata |
| DELETE | `/:id` | Delete from Supabase + R2 |

### 4.3 Content Structuring

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/subjects` | Create a subject |
| GET | `/api/subjects` | List all subjects |
| GET | `/api/subjects/:id` | Get one subject |
| PUT | `/api/subjects/:id` | Update subject |
| DELETE | `/api/subjects/:id` | Delete subject (cascades to all children) |
| POST | `/api/chapters` | Create a chapter (needs subjectId in body) |
| GET | `/api/chapters/:subjectId` | Get all chapters for a subject |
| PUT | `/api/chapters/:id` | Update chapter |
| DELETE | `/api/chapters/:id` | Delete chapter |
| POST | `/api/subtopics` | Create a subtopic (needs chapterId in body) |
| GET | `/api/subtopics/:chapterId` | Get all subtopics for a chapter |
| PUT | `/api/subtopics/:id` | Update subtopic |
| DELETE | `/api/subtopics/:id` | Delete subtopic |

### 4.4 Storage Info

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/storage/usage` | Total bytes used, PDF count, video count |
| GET | `/api/storage/content-stats` | Breakdown by subject and by user |

---

## 5. Environment Variables (.env)

> Never commit `.env` to git. Add it to `.gitignore` immediately.

```env
SUPABASE_URL=https://yourproject.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key   # NOT the anon key

R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key
R2_SECRET_ACCESS_KEY=your-r2-secret-key
R2_BUCKET_NAME=your-bucket-name
R2_PUBLIC_URL=https://cdn.yourdomain.com     # custom domain, not .r2.dev

PORT=8000   # 5000 is taken by AirPlay on Mac
```

---

## 6. Dependencies

| Package | Purpose |
|---------|---------|
| `express` | HTTP server and routing |
| `cors` | Allow cross-origin requests from the frontend |
| `dotenv` | Load .env into process.env |
| `multer` | Handle multipart/form-data file uploads |
| `@supabase/supabase-js` | Supabase client — DB queries and auth |
| `@aws-sdk/client-s3` | R2 file upload/delete (R2 is S3-compatible) |
| `@aws-sdk/s3-request-presigner` | Generate signed URLs for R2 files |
| `nodemon` (dev) | Auto-restart server on file changes |

Install everything:
```bash
npm install express cors dotenv multer @supabase/supabase-js @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
npm install --save-dev nodemon
```

---

## 7. Key Decisions & Notes

- **Port 8000 not 5000** — AirPlay Receiver on Mac hijacks port 5000
- **No `"type": "module"`** — use `require()` / `module.exports` throughout, not ESM import/export
- **Use `SUPABASE_SERVICE_KEY` on the backend** — never the anon key. Service key bypasses RLS and is safe server-side only
- **`r2_key` stores the bucket path, NOT the full URL** — URLs are generated at request time via signed URLs
- **`on delete cascade` on all FK constraints** — deleting a subject cleans up all chapters, subtopics, PDFs, and videos below it
- **`order_index` on subjects, chapters, subtopics** — controls display order in the frontend, sort ascending
- **Videos stream via signed R2 URLs with HTTP Range headers (206 Partial Content)** — allows seeking without re-downloading
- **Express never streams the video file itself** — it only returns a signed URL, client fetches directly from Cloudflare