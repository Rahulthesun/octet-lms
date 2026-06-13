# C@O LMS – Database & Auth Reference

**Project:** Chemistry@OCTET (OCTET LMS)  
**Stack:** Express · Supabase (PostgreSQL + Auth) · Cloudflare R2  
**Architecture:** Server‑side only – all database access uses `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS)

---

## 1. Core Concepts

| Domain | Description |
|--------|-------------|
| **Content Management** | Subjects → Chapters → Subtopics → PDFs / Videos. Hierarchical learning materials. |
| **Student Management** | Admission form → `PENDING` record → Approval → Create Supabase Auth user → `APPROVED` student. |
| **Storage** | All files (PDFs, videos, thumbnails, student documents) stored in Cloudflare R2. Metadata in Supabase. |

Foreign keys always use `ON DELETE CASCADE` – deleting a parent removes all children.

---

## 2. Database Schema (Supabase PostgreSQL)

### 2.1 Batches

Morning / Evening / Night with fixed timings from admission form.

```sql
CREATE TABLE public.batches (
    id TEXT PRIMARY KEY,                     -- 'MORNING', 'EVENING', 'NIGHT'
    name TEXT NOT NULL,
    days TEXT,                               -- e.g., 'Tue/Thu/Sat'
    start_time TIME,
    end_time TIME,
    delivery_type TEXT CHECK (delivery_type IN ('ONLINE', 'OFFLINE', 'HYBRID')),
    meet_link TEXT,
    location TEXT
);

INSERT INTO public.batches (id, name, days, start_time, end_time, delivery_type) VALUES
    ('MORNING', 'Morning Batch', 'Tue/Thu/Sat', '06:15', '07:30', 'HYBRID'),
    ('EVENING', 'Evening Batch', 'Tue/Thu/Sat', '17:00', '18:15', 'HYBRID'),
    ('NIGHT', 'Night Batch', 'Tue/Thu/Sat', '21:00', '22:10', 'ONLINE');
```

### 2.2 Students (Admission + Profile)

Every field from the admission form.  
`auth_user_id` links to `auth.users.id` only after approval. Pending students have `NULL`.

```sql
CREATE TABLE public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE,                     -- FK to auth.users, NULL until approved
    admission_number TEXT UNIQUE,
    
    -- Personal
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    date_of_birth DATE,
    mobile_number TEXT,
    whatsapp_number TEXT,
    telegram_number TEXT,
    
    -- 10th details
    tenth_school TEXT,
    tenth_score TEXT,
    
    -- Current academics
    class_grade TEXT,
    school_college TEXT,
    subjects TEXT[],
    
    -- Tuition / coaching
    maths_tuition TEXT,
    physics_tuition TEXT,
    other_tuition TEXT,
    neet_jee_details TEXT,
    future_plan TEXT,
    
    -- Batch & mode
    preferred_batch TEXT REFERENCES public.batches(id),
    learning_mode TEXT NOT NULL CHECK (learning_mode IN ('ONLINE', 'OFFLINE', 'HYBRID')),
    
    -- Father
    father_name TEXT,
    father_mobile TEXT,
    father_whatsapp TEXT,
    father_telegram TEXT,
    father_email TEXT,
    father_profession TEXT,
    
    -- Mother
    mother_name TEXT,
    mother_mobile TEXT,
    mother_whatsapp TEXT,
    mother_telegram TEXT,
    mother_email TEXT,
    mother_profession TEXT,
    
    -- Address
    address TEXT,
    landmark TEXT,
    city TEXT,
    pincode TEXT,
    
    -- Document URLs (R2 signed URLs generated at request time)
    marksheet_10th_url TEXT,
    school_id_card_url TEXT,
    uniform_photo_url TEXT,
    
    -- System
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    username TEXT UNIQUE,
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Foreign key to Auth (after creation):**

```sql
ALTER TABLE public.students
    ADD CONSTRAINT fk_students_auth_user
    FOREIGN KEY (auth_user_id) REFERENCES auth.users(id)
    ON DELETE SET NULL;   -- or CASCADE
```

### 2.3 Admission Requests Log

Raw Google Form submissions for audit.

```sql
CREATE TABLE public.admission_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    form_response_id TEXT,
    raw_data JSONB,
    processed BOOLEAN DEFAULT FALSE,
    student_email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.4 Content Hierarchy

#### subjects

```sql
CREATE TABLE public.subjects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    order_index INTEGER DEFAULT 0,
    is_visible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### chapters

```sql
CREATE TABLE public.chapters (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    order_index INTEGER DEFAULT 0,
    is_visible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### subtopics

```sql
CREATE TABLE public.subtopics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    chapter_id UUID REFERENCES public.chapters(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    order_index INTEGER DEFAULT 0,
    is_visible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### pdfs

```sql
CREATE TABLE public.pdfs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    subtopic_id UUID REFERENCES public.subtopics(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    filename TEXT NOT NULL,
    r2_key TEXT NOT NULL UNIQUE,              -- path inside R2 bucket
    mime_type TEXT DEFAULT 'application/pdf',
    size_bytes BIGINT,
    uploaded_by UUID REFERENCES auth.users(id),
    is_visible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### videos

```sql
CREATE TABLE public.videos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    subtopic_id UUID REFERENCES public.subtopics(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    filename TEXT NOT NULL,
    r2_key TEXT NOT NULL UNIQUE,
    thumbnail_key TEXT,                       -- R2 key for thumbnail image
    mime_type TEXT DEFAULT 'video/mp4',
    size_bytes BIGINT,
    duration_secs INTEGER,
    uploaded_by UUID REFERENCES auth.users(id),
    is_visible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.5 Indexes

```sql
CREATE INDEX idx_students_email ON public.students(email);
CREATE INDEX idx_students_status ON public.students(status);
CREATE INDEX idx_students_auth_user ON public.students(auth_user_id);
CREATE INDEX idx_students_batch ON public.students(preferred_batch);

CREATE INDEX idx_pdfs_subtopic ON public.pdfs(subtopic_id);
CREATE INDEX idx_videos_subtopic ON public.videos(subtopic_id);
CREATE INDEX idx_chapters_subject ON public.chapters(subject_id);
CREATE INDEX idx_subtopics_chapter ON public.subtopics(chapter_id);
```

### 2.6 Auto‑update `updated_at`

```sql
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER update_students_updated_at
    BEFORE UPDATE ON public.students
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Repeat for subjects, chapters, subtopics, pdfs, videos (optional but recommended)
```

### 2.7 Admission Number Generator

```sql
CREATE SEQUENCE public.admission_number_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_admission_number()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    year TEXT;
    next_num INTEGER;
BEGIN
    year := TO_CHAR(NOW(), 'YYYY');
    next_num := nextval('public.admission_number_seq');
    RETURN 'OCTET-' || year || '-' || LPAD(next_num::TEXT, 3, '0');
END;
$$;
```

---

## 3. Storage (Cloudflare R2)

### 3.1 What is stored where

| File type | R2 bucket folder | `r2_key` example |
|-----------|----------------|------------------|
| PDFs | `pdfs/` | `pdfs/2024/abc-123.pdf` |
| Videos | `videos/` | `videos/2024/def-456.mp4` |
| Thumbnails | `thumbnails/` | `thumbnails/def-456.jpg` |
| 10th marksheet | `documents/` | `documents/marksheet_<uuid>.pdf` |
| School ID card | `documents/` | `documents/idcard_<uuid>.jpg` |
| Uniform photo | `documents/` | `documents/uniform_<uuid>.png` |

### 3.2 Workflow for a file

1. Client uploads file to Express (multipart/form-data)
2. Express generates a unique `r2_key` (e.g., `pdfs/2024/<uuid>-originalname.pdf`)
3. Upload file to R2 using AWS SDK (S3‑compatible)
4. Save metadata (title, size, `r2_key`, etc.) to Supabase
5. Return success

### 3.3 Serving files (signed URLs)

- **Never return the raw R2 URL** – always generate a **signed URL** valid for a short time (e.g., 1 hour).
- Client then downloads directly from Cloudflare – Express is not a proxy.

```javascript
// Example: generate signed URL for a PDF
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const command = new GetObjectCommand({ Bucket, Key: r2_key });
const url = await getSignedUrl(r2Client, command, { expiresIn: 3600 });
```

Videos also use signed URLs; frontend `<video src="...">` works with HTTP Range requests (206 Partial Content) automatically.

---

## 4. Authentication & Authorisation

### 4.1 Supabase Auth

- `auth.users` is managed **only** for approved students (and possibly admins).
- **Pending students** have `auth_user_id = NULL` – no auth account yet.
- On approval, the backend:
  - Calls `supabase.auth.admin.createUser()` to create the account.
  - Updates `students.auth_user_id` with the new `user.id`.
  - Sends a welcome email with temporary password.

### 4.2 Roles

- **Student** – identified by `auth_user_id` not null + `status = 'APPROVED'`.
- **Admin** – not stored in `auth.users`; instead, use a separate `admins` table or a `is_admin` flag in `students` (if admins are also students). For simplicity, the API uses a hardcoded admin check or a separate admin authentication flow (e.g., another Supabase project or a simple shared secret). Because the backend is server‑side, you can also rely on the `SUPABASE_SERVICE_ROLE_KEY` for all admin operations – no auth required for the API itself if it's internal.

### 4.3 No Row Level Security (RLS)

All database access uses the **service role key** (`SUPABASE_SERVICE_ROLE_KEY`).  
RLS is **disabled** on all tables because the backend is trusted and the frontend never talks directly to Supabase.

> Important: Never expose the service role key to the client.

---

## 5. API Endpoints (Summary)

### Student Management

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/students/bulk-import` | Create multiple pre‑approved students (creates auth users, sends emails) |
| POST | `/api/enrollment/webhook` | Receive Google Form submission → create PENDING student |
| POST | `/api/students/:id/approve` | Approve a PENDING student, create auth user, send email |
| GET | `/api/students` | List all students (with filters: batch, mode, status, search) |
| GET | `/api/students/pending` | List PENDING applications |
| GET | `/api/students/:id` | Get a single student |
| PUT | `/api/students/:id` | Update student info |
| DELETE | `/api/students/:id` | Delete student (also delete auth user if exists) |

### Authentication Utilities (for student self‑service)

These endpoints are optional – the frontend can use Supabase JS client directly with the anon key. But if you want to keep everything behind your API:

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Proxy to Supabase Auth – returns session |
| GET | `/api/auth/me` | Get current student profile (requires JWT) |
| POST | `/api/auth/change-password` | Change password (requires JWT) |
| POST | `/api/auth/forgot-password` | Trigger reset email |

### Content Management

All routes mounted under `/api`.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/subjects` | List all subjects |
| POST | `/subjects` | Create subject |
| PUT | `/subjects/:id` | Update subject |
| DELETE | `/subjects/:id` | Delete subject (cascade) |
| GET | `/chapters/:subjectId` | Chapters of a subject |
| POST | `/chapters` | Create chapter |
| ... | etc. for chapters, subtopics | |

### File Storage

| Method | Path | Description |
|--------|------|-------------|
| POST | `/content/pdf/upload` | Upload PDF + metadata |
| GET | `/content/pdf/:id` | Get PDF metadata + signed URL |
| DELETE | `/content/pdf/:id` | Delete PDF from R2 and DB |
| POST | `/content/video/upload` | Upload video + thumbnail |
| GET | `/content/video/:id` | Video metadata + signed URL |
| GET | `/content/video/:id/stream` | Return signed URL (or proxy streaming) |

---

## 6. Environment Variables

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key   # never expose to client

# Cloudflare R2
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=octet-lms-files
R2_PUBLIC_URL=https://cdn.octet.com   # optional custom domain

# Server
PORT=8000

# Email (for sending credentials)
EMAIL_USER=octet@yourmail.com
EMAIL_PASS=app-password
```

---

## 7. Key Rules & Conventions

| Rule | Reason |
|------|--------|
| All DB access uses service role key | Bypasses RLS; backend is trusted. |
| `auth_user_id` is NULL until approval | Pending students have no auth account. |
| Foreign keys with `ON DELETE CASCADE` | Simpler cleanup – delete subject → everything under it gone. |
| `r2_key` stores relative path, not full URL | Allows changing CDN domain without updating DB. |
| Signed URLs are generated per request | Gives time‑limited access, no public permanent links. |
| No RLS on any table | Not needed because client never queries DB directly. |
| Admission numbers generated by DB function | Guarantees uniqueness and format `OCTET-YYYY-XXX`. |

---

## 8. Example Data Flow – Student Approval

```
1. Google Form submitted → POST /api/enrollment/webhook
   → Insert into students (status='PENDING', auth_user_id=NULL)
   → Store raw data in admission_requests

2. Admin sees pending list → GET /api/students/pending

3. Admin clicks Approve → POST /api/students/{id}/approve
   → Call generate_admission_number()
   → Generate temporary password
   → supabase.auth.admin.createUser(...)
   → Update students set auth_user_id, admission_number, status='APPROVED'
   → Send welcome email with credentials

4. Student logs in (frontend uses Supabase client or /api/auth/login)
   → JWT session created
   → Can fetch own profile from /api/auth/me
```

---
