# Backend

Express backend for the football frontend in this workspace.

## Features

- JWT auth with register, login, profile, password change
- MongoDB Atlas via Mongoose
- Favorites, comments, prediction history
- Football endpoints aligned to the frontend API contract
- News endpoint with GNews fallback
- Admin summary endpoints

## Run locally

1. Copy `.env.example` to `.env`
2. Install packages
3. Start the API

```bash
npm install
npm run dev
```

Default API base URL:

```txt
http://localhost:5000/api
```

## Suggested deploy split

- Frontend: Vercel
- Backend: Railway / Render / Fly.io
- Database: MongoDB Atlas

## Core endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `PATCH /api/auth/me`
- `PATCH /api/auth/change-password`
- `GET /api/football/standings`
- `GET /api/football/teams`
- `GET /api/football/fixtures?type=upcoming&limit=6`
- `GET /api/football/topscorers`
- `GET /api/football/topassists`
- `GET /api/football/cleansheets`
- `GET /api/football/player-stats`
- `GET /api/football/players/:id`
- `GET /api/football/predictions/:id`
- `GET /api/news`
- `GET /api/favorites`
- `POST /api/favorites`
- `GET /api/comments?targetType=match&targetId=123`
- `POST /api/comments`
- `POST /api/predictions`
- `GET /api/predictions`
- `GET /api/admin/dashboard`

## Frontend integration

Set the frontend env to point at this backend:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

Example:

```ts
const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/football/fixtures?type=upcoming&limit=6`)
const data = await res.json()
```

## Deploy notes

- Add all values from `.env.example` to the backend host
- `CLIENT_URL` supports multiple origins separated by commas
- Example: `CLIENT_URL=https://your-app.vercel.app,https://your-app-git-main-yourteam.vercel.app`
- If frontend and backend use different domains, send JWT in `Authorization: Bearer <token>`
- Keep MongoDB Atlas network access open for the backend host or allow its outbound IP range
