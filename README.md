# GitHub Profile Analyzer API

A Node.js + Express REST API that fetches public GitHub profile data, computes useful insights, and stores them in MySQL.

## Tech Stack

- **Runtime** — Node.js (native TypeScript via `--experimental-strip-types`)
- **Framework** — Express 5
- **Database** — MySQL 8 (hosted on [Aiven](https://aiven.io))
- **GitHub Client** — Octokit

---

## Features

| Feature | Detail |
|---|---|
| Analyze any GitHub user | `POST /analyze/:username` fetches the live profile + repos |
| List all profiles | `GET /profiles` — newest first |
| Fetch one profile | `GET /profiles/:username` |
| Delete a profile | `DELETE /profiles/:username` |

---

## Setup

### 1. Clone & install

```bash
git clone <repo-url>
cd github-profile-analyzer-api
npm install
```

### 2. Environment variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | MySQL connection string |
| `PORT` | No | Defaults to `3000` |

### 3. Run

```bash
node --experimental-strip-types src/index.ts
```

The server auto-creates the `github_profiles` table on first boot.

---

## API Reference

### `GET /`

Returns a list of all available endpoints.

---

### `POST /analyze/:username`

Fetches the GitHub profile for `:username`, computes insights, and stores (or refreshes) the record in MySQL.

**Example**
```
POST /analyze/torvalds
```

**Response `200`**
```json
{
  "message": "Profile analyzed and stored successfully",
  "profile": {
    "id": 1,
    "username": "torvalds",
    "name": "Linus Torvalds",
    "bio": "...",
    "public_repos": 8,
    "followers": 230000,
    "following": 0,
    "total_stars": 215000,
    "top_languages": [
      { "language": "C", "repo_count": 4 }
    ],
    "top_repos": [
      { "name": "linux", "stars": 195000, "forks": 58000, "language": "C", "url": "..." }
    ],
    "analyzed_at": "2026-06-02T10:00:00.000Z"
  }
}
```

**Response `404`** — GitHub user not found.

---

### `GET /profiles`

Returns all stored profiles, newest first.

**Response `200`**
```json
{
  "count": 3,
  "profiles": [ ... ]
}
```

---

### `GET /profiles/:username`

Returns a single stored profile.

**Response `200`** — profile object (same shape as above).  
**Response `404`** — not yet analyzed.

---

### `DELETE /profiles/:username`

Removes the stored profile from the database.

**Response `200`**
```json
{ "message": "Profile 'torvalds' deleted successfully" }
```

---

## Database Schema

See [`schema.sql`](./schema.sql) for the full DDL.

Key columns:

| Column | Type | Description |
|---|---|---|
| `username` | VARCHAR | Unique GitHub login |
| `public_repos` | INT | Number of public repositories |
| `followers` / `following` | INT | Social graph counts |
