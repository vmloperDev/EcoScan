# EcoScan

EcoScan is a browser-based prototype for a real-time waste classification framework using edge computer vision concepts and mobile data analytics. It is designed for locations with weak connectivity, such as cafeterias, basements, and campus disposal areas.

Project proposer: Floyd Allen B. Bueno, BSCS-2C, Gordon College  
Academic period: 2nd Semester, A.Y. 2025-2026  
SDG alignment: SDG 12 - Responsible Consumption and Production

## What this prototype includes

- EcoScan Prime dashboard with Dashboard, History, and Settings
- Progressive Web App structure with manifest and offline app-shell caching
- Edge AI scanner core with camera capture, image upload, local classification, confidence score, and bin guidance
- Browser-side TensorFlow.js classification using the exported model in `public/model`
- Cyan-framed Edge AI scanner interface with material detection feedback
- Manual Confirm or Rescan verification before scan results enter analytics
- Offline-first scan history stored in the browser
- Dashboard cards for total CO2 reduced, items sorted, system accuracy, and local energy saved
- Stats screen with Eco-Insights charts for weekly statistics and energy efficiency
- Project documentation for proposal, requirements, and future AI integration
- Login, signup, forgot password, and quick-access portal matching the EcoScan Prime style

## How to run

Install dependencies:

```bash
npm install
```

Create a `.env` file from `.env.example`, then add your Firebase web app config.

Start the React app:

```bash
npm run dev
```

Then visit `http://127.0.0.1:4173`.

## Firebase authentication

EcoScan now uses Firebase Authentication through React.

Supported auth flows:

- Email and password login
- Email and password signup
- Password reset email
- Google login popup
- Persistent auth session
- Logout from Settings

If `.env` is not configured yet, the app falls back to demo auth so the UI remains testable.

## Progressive design status

EcoScan now uses a progressive web app structure. The main interface is cached by `sw.js`, scan history is stored locally, and the layout adapts from mobile to desktop. Camera classification still runs on-device in the browser prototype, while future cloud sync can be added for verified analytics.

## Important note about the classifier

This version uses a local TensorFlow.js classifier in `src/edgeClassifier.js` and loads model files from `public/model`. It runs in the browser without sending images to the cloud. A lightweight fallback classifier remains available if the model cannot load.

For a stronger research or defense-ready version, keep improving the trained model using:

- More real school-background images
- Balanced waste classes
- A `background` class for “no item detected”
- Test images that were not used during training

## Suggested final system architecture

1. Mobile or browser client captures a waste image.
2. Edge AI model runs locally on the device.
3. Predicted category and confidence are shown immediately.
4. Scan result is stored locally when offline.
5. When internet becomes available, summarized scan data syncs to a cloud dashboard.
6. Dashboard visualizes habits, recycling rate, contamination trends, and personal impact.

## Folder contents

- `index.html` - main prototype interface
- `src/main.jsx` - React app, screens, dashboard logic, and auth UI
- `src/firebase.js` - Firebase Authentication setup
- `styles.css` - EcoScan Prime visual system
- `package.json` - React, Vite, and Firebase dependencies
- `public/manifest.webmanifest` - installable app metadata
- `public/sw.js` - offline app-shell cache for progressive behavior
- `public/model` - TensorFlow.js model files used by the scanner
- `vercel.json` - Vercel static deployment configuration
- `render.yaml` - Render static site blueprint
- `DEPLOYMENT.md` - Vercel and Render deployment steps
- `docs/project-proposal.md` - polished project proposal draft
- `docs/requirements.md` - system requirements and feature list
- `docs/model-integration.md` - guide for replacing the demo classifier with a real model
