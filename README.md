# モーション (Motion) — Workout Tracker

A fast, offline-friendly workout log for dumbbell and bodyweight training. No backend, no account — everything is saved privately in your phone's browser storage. It installs like a native app so you can open it from your home screen.

## Features

- Pick exercises from a built-in library of dumbbell and bodyweight movements, or add your own custom ones
- Filter the exercise list by muscle group (chest, back, shoulders, biceps, triceps, legs, glutes, core, full body)
- Each exercise starts with 3 sets — add or remove sets freely
- Log reps and weight (kg) per set, with a one-tap "BW" toggle for bodyweight sets
- Sessions are timestamped automatically; tap **End workout** when you're done to save it to History
- Save any workout as a reusable **template**, or build one from scratch, so a routine like "Arm Day" is one tap away
- Multiple people can use the app on the same device — each profile's workouts are kept completely separate (tap the profile pill in the header to switch, add, rename, or delete a profile)
- Export/import a JSON backup of the current profile any time, since data lives only on this device

## Templates

The **Templates** tab holds reusable workouts. There are two ways to build one:
- **Save a workout you already did** — from an in-progress or past workout, tap "Save this workout as a template" and give it a name
- **Build one from scratch** — tap "+ New template" in the Templates tab, name it, and pick exercises with the same search/filter picker used everywhere else

Tap **Start workout** on a template to load all of its exercises into today's session. Each exercise is pre-filled with the sets, reps, and weight from the *last time you actually performed it* — so the numbers stay current as you progress, rather than staying frozen at whatever they were when you first saved the template. If you've never logged an exercise before, it starts with 3 blank sets like normal.

## Profiles

Tap the pill in the top-right of the header (shows the current profile's initial) to open the profile switcher. From there you can:
- **Switch** — tap any name to make it active
- **Add** — type a name at the bottom and tap Add
- **Rename** (pencil icon) or **Delete** (✕ icon, only shown when there's more than one profile)


Profiles are just named buckets of local data — there's no password. Anyone with access to the device can switch between them, which is fine for a shared household device but isn't meant to keep people out of each other's data on a device others can unlock. On first launch (or if you upgraded from an earlier version without profiles), you'll be asked to create one — any pre-existing workout history is automatically moved into a profile called "Me".

## Ending a workout

Your current session stays "in progress" until you tap **End workout** at the top of the Today tab. Ending it saves the session — with a start time, end time, and duration — to the History tab. If you end a workout with no exercises logged, the app will offer to discard it instead of saving an empty entry. You can start a new workout any time by tapping **+ Add exercise** again.

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
