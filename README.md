# stillroom — music, meaningfully

A full-stack music listening room built with **Next.js (App Router) + React + Node.js**, written entirely in **plain JavaScript** (`.js` / `.jsx`). There is no TypeScript source code in the app.

## Database: MongoDB only

Persistence uses MongoDB through the official `mongodb` Node.js driver. No PostgreSQL, no Drizzle, no ORM.

- `MONGODB_URL` lives in `.env` (defaults to `mongodb://127.0.0.1:27017/stillroom`)
- Connection + typed collections: `src/db/index.js`
- Audio binaries are stored inside MongoDB documents (`bytea`-style `Buffer`) and streamed back by the API with HTTP range support
- Collections: `tracks`, `favorites`, `playlists`
- `src/lib/mongo-process.js` can auto-start a local `mongod` if the sandbox is cold, so the app self-heals

## Features

- Editorial dashboard with animated, generated cover art (pure CSS, no image services)
- Music player: play/pause, seek, previous/next, shuffle, repeat (off/all/one), volume, keyboard shortcuts
- Upload your own audio (MP3, WAV, OGG, M4A, AAC, FLAC, WebM — up to 32 MB) with cover mood picker
- Real-time search, genre filters, sorting (featured / recent / most played / A–Z)
- Liked songs and custom collections ("playlists") stored in MongoDB
- Queue panel, now-playing panel, mobile navigation, upload + create-collection dialogs
- Live play counters and delete-your-own-upload controls
- Demo library of six original instrumental previews, generated on first run

## API (all Node.js route handlers)

| Route | Purpose |
| --- | --- |
| `GET /api/health` | MongoDB ping |
| `GET /api/library` | Tracks + favorites + playlists |
| `GET/POST /api/tracks` | List / upload tracks |
| `DELETE /api/tracks/:id` | Delete an uploaded track |
| `GET /api/tracks/:id/audio` | Stream audio (range requests) |
| `POST /api/tracks/:id/play` | Increment play count |
| `GET /api/favorites`, `PUT/DELETE /api/favorites/:id` | Liked songs |
| `GET/POST /api/playlists`, `PATCH/DELETE /api/playlists/:id` | Collections |
| `POST/DELETE /api/playlists/:id/tracks` | Add / remove tracks in a collection |

`tsconfig.json` remains only as a tooling file with `allowJs: true` and `checkJs: false`, so the platform's `tsc --noEmit` check can run over the JavaScript sources without type checking them.
