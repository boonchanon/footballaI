# Deploy Guide

This project is set up to deploy as two services:

- Frontend: Next.js on Vercel
- Backend: Express API on Railway
- Database: MongoDB Atlas

## 1. Backend on Railway

Create a new Railway project from the `backend/` folder or select `backend` as the root directory.

Required environment variables:

```env
PORT=5000
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@YOUR-CLUSTER.mongodb.net/epl_project?retryWrites=true&w=majority
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=7d
CLIENT_URL=https://your-app.vercel.app,https://your-app-git-main-yourteam.vercel.app
API_FOOTBALL_KEY=
GNEWS_API_KEY=
```

After deploy, copy the public Railway URL. Example:

```txt
https://football-api-production.up.railway.app
```

Health check:

```txt
https://football-api-production.up.railway.app/health
```

## 2. Frontend on Vercel

Create a Vercel project from the repository root.

Set this environment variable in Vercel:

```env
NEXT_PUBLIC_API_URL=https://your-railway-app.up.railway.app/api
```

Then redeploy the frontend.

## 3. Domains

Suggested setup:

- `https://your-app.vercel.app` for the frontend
- `https://api.yourdomain.com` for the backend

If you attach a custom domain to Railway, update:

- `NEXT_PUBLIC_API_URL` on Vercel
- `CLIENT_URL` on Railway

## 4. Important Notes

- Do not commit `.env`, `.env.local`, or `.vercel`
- Change any MongoDB password that was previously shared in chat
- MongoDB Atlas Network Access must allow Railway to connect
- If Vercel preview deployments should access the API, include the preview domains in `CLIENT_URL`

## 5. Local Run

```powershell
cd "D:\bundesliga-clubs-display (1)\backend"
npm start
```

```powershell
cd "D:\bundesliga-clubs-display (1)"
npm run dev
```
