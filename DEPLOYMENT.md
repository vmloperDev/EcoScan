# EcoScan Deployment

EcoScan is a Vite React static app. Deploy the same repository to either Vercel or Render.

## Required Environment Variables

Add these to the hosting dashboard before deploying:

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

Use the values from your local `.env` file.

## Vercel

1. Push this project to GitHub.
2. Open Vercel and choose **Add New > Project**.
3. Import the GitHub repo.
4. Use these settings:

```text
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

5. Add the Firebase environment variables.
6. Deploy.

The included `vercel.json` handles SPA rewrites, the service worker cache header, and model file caching.

## Render

1. Push this project to GitHub.
2. Open Render and choose **New > Blueprint** if you want to use `render.yaml`, or **New > Static Site** for manual setup.
3. If deploying manually, use:

```text
Build Command: npm install && npm run build
Publish Directory: dist
```

4. Add the Firebase environment variables.
5. Deploy.

The included `render.yaml` defines the static site, publish path, rewrite fallback, and cache headers.

## Firebase Authorized Domains

After deployment, add your deployed domains in Firebase:

```text
Authentication > Settings > Authorized domains
```

Add both hosting domains, for example:

```text
your-ecoscan.vercel.app
your-ecoscan.onrender.com
```

Google login will not work on the deployed app until the deployed domain is authorized.
