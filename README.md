# Repository Workflow Update

## Why We Are Moving from `test` → `integrate-ui`

The previous `test` branch used a **different project structure** from the main codebase.

### Old structure (`test`)

```txt
app/
components/
lib/
public/
```

### Main codebase structure

```txt
api/
web/
```

This caused an architecture mismatch and Git history issues between branches.

To fix this, the frontend has now been reorganized into a **monorepo structure** and moved into `/web`.

### Going forward

- ❌ **Do NOT push to `test` anymore**
- ✅ **Use `integrate-ui` as the working branch**
- ✅ **Both of us will collaborate on the same structure**

---

# Codebase Structure

The repository is now organized as a **monorepo**.

```txt
repo-root/
│
├── api/              # Backend/API services
│
├── web/              # Next.js frontend application
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── public/
│   ├── package.json
│   ├── next.config.ts
│   └── ...
│
├── .gitignore
└── .git/
```

## What is a Monorepo?

A monorepo means:

> One repository containing multiple apps/services.

In our case:

### `/api`

Contains backend-related logic.

Examples:

- APIs
- Database logic
- Authentication
- Server-side functionality

### `/web`

Contains the **entire Next.js frontend**.

Examples:

- UI pages
- Components
- Styling
- Client-side logic

This structure keeps frontend and backend cleanly separated and easier to scale.

---

# IMPORTANT: Git Exists Only at Root

Git exists **ONLY at the repository root**.

### Correct

```txt
repo-root/
├── .git
├── api/
└── web/
```

### Wrong ❌

Do **NOT** run:

```bash
git init
```

inside:

```txt
web/
api/
```

or any subfolder.

That creates a nested Git repository and breaks collaboration.

We already have a Git repository initialized at the root.

---

# Moving from `test` → `integrate-ui`

## Step 1 — Save Any Uncommitted Work

If you have uncommitted changes:

```bash
git stash
```

or commit them on `test` before switching.

---

## Step 2 — Pull Latest Branches

```bash
git fetch origin
```

---

## Step 3 — Switch to `integrate-ui`

If branch exists locally:

```bash
git checkout integrate-ui
git pull origin integrate-ui
```

If branch does NOT exist locally:

```bash
git checkout -b integrate-ui origin/integrate-ui
```

---

# Where to Work

## Frontend Work

Always work inside:

```txt
/web
```

Run frontend commands from:

```bash
cd web
npm install
npm run dev
```

**Do NOT run frontend development from repo root.**

---

## Backend Work

Backend logic belongs in:

```txt
/api
```

Keep frontend and backend separated.

---

# Daily Git Workflow

## Before Starting Work

Always pull latest changes:

```bash
git pull
```

This avoids conflicts.

---

## After Making Changes

From the **repo root**:

```bash
git add .
git commit -m "describe what changed"
git push
```

Example:

```bash
git commit -m "Added dashboard components"
```

---

# Team Rules

## 1. Do Not Use `test`

`test` is deprecated.

All work goes into:

```txt
integrate-ui
```

---

## 2. Pull Before Coding

Always:

```bash
git pull
```

before starting work.

---

## 3. Avoid Editing the Same Files Simultaneously

Especially:

- shared layouts
- config files
- common components
- root app files

This minimizes merge conflicts.

---

## 4. Do Not Restructure the Project

Do **NOT** flatten or restructure folders again.

The standard is:

```txt
/api
/web
```

Frontend stays inside `/web`.

---

# Quick Summary

### Working branch

```txt
integrate-ui
```

### Frontend location

```txt
/web
```

### Backend location

```txt
/api
```

### Never run

```bash
git init
```

inside subfolders.

### Before work

```bash
git pull
```

### After work

```bash
git add .
git commit -m "message"
git push
```

We now have one shared structure so frontend and backend can evolve cleanly without branch conflicts.
