# National Girlfriend's Day

A small romantic web game with three playful questions, an illustrated avatar, a moving quest path, and a Heart Catcher finale. Catching 67 hearts unlocks the final present and love letter.

## Run locally

Requires Node.js 22 or newer.

```bash
npm install
npm run dev
```

Open `http://localhost:3000` (or the URL shown in the terminal).

## Upload to GitHub

Create an empty GitHub repository, then run these commands inside this project folder:

```bash
git init
git add .
git commit -m "Create National Girlfriend's Day game"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
git push -u origin main
```

## Deploy on Render

The included `render.yaml` lets Render configure the site automatically.

1. In Render, choose **New → Blueprint**.
2. Connect the GitHub repository you uploaded.
3. Select `render.yaml` and create the service.
4. Wait for the build to finish, then open the generated Render URL.

If creating a normal Web Service instead, use:

- Runtime: `Node`
- Build command: `npm ci && npm run build`
- Start command: `npm start`
- Node version: `22.13.0`

## Main files

- `app/page.tsx` — questions, progress path, Heart Catcher, and final letter
- `app/globals.css` — complete visual design and responsive layout
- `public/her-avatar.png` — illustrated avatar generated from the supplied reference
- `render.yaml` — Render deployment settings
