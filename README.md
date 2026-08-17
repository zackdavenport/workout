# Iron Log — Workout Tracker

A fast, offline-friendly workout log for dumbbell and bodyweight training. No backend, no account — everything is saved privately in your phone's browser storage. It installs like a native app so you can open it from your home screen.

## Features

- Pick exercises from a built-in library of dumbbell and bodyweight movements, or add your own custom ones
- Filter the exercise list by muscle group (chest, back, shoulders, biceps, triceps, legs, glutes, core, full body)
- Each exercise starts with 3 sets — add or remove sets freely
- Log reps and weight (kg) per set, with a one-tap "BW" toggle for bodyweight sets
- Today's session is dated automatically; past sessions are saved to History
- Export/import a JSON backup any time, since data lives only on this device

## Host it on GitHub Pages

1. Create a new GitHub repository (public or private both work), e.g. `workout-tracker`.
2. Upload all the files in this folder to the root of that repository — `index.html`, `style.css`, `app.js`, `exercises.js`, `manifest.json`, `service-worker.js`, and the `icons/` folder. You can drag-and-drop them in the GitHub web UI, or use git:
   ```
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/workout-tracker.git
   git push -u origin main
   ```
3. In the repo, go to **Settings → Pages**.
4. Under **Build and deployment → Source**, choose **Deploy from a branch**.
5. Set **Branch** to `main` and folder to `/ (root)`, then **Save**.
6. After a minute or two, GitHub will publish it at:
   `https://YOUR_USERNAME.github.io/workout-tracker/`

## Install it on your phone

**iPhone (Safari):** open the URL above → tap the Share icon → **Add to Home Screen**.

**Android (Chrome):** open the URL above → tap the **⋮** menu → **Add to Home screen** (or **Install app** if Chrome offers it automatically).

Once installed, it opens full-screen like a native app and keeps working without a connection — only the very first load needs internet.

## A note on your data

Workouts are stored in your browser's local storage on that one device/browser only — nothing is sent to a server. This means:
- Your data is private by default.
- Clearing your browser's site data/cache will erase it, so use **Export backup** (bottom of the app) occasionally to save a JSON file, and **Import backup** to restore it on a new phone or after reinstalling.
- If you ever want cross-device sync, that would need a backend added later — just ask if you'd like that upgrade.

## Customizing the exercise library

The built-in list lives in `exercises.js` — feel free to edit it directly (add, rename, or remove entries) before hosting, in addition to adding exercises from within the app itself.
