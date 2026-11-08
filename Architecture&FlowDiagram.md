# Architecture

**stillroom** is a single-service, full-stack music app: a Next.js (App Router) application written in plain JavaScript, with React on the client and Node.js route handlers on the server. **MongoDB is the only data store** — metadata *and* the audio files themselves live in MongoDB documents.

---

## 1. High-level system architecture

```mermaid
flowchart TB
    subgraph Browser["Browser (client)"]
        UI["React UI<br/>music-studio.jsx"]
        State["Client state<br/>tracks · favorites · playlists · player"]
        Audio["HTML5 audio element<br/>streaming and seeking"]
        UI --> State
        State --> Audio
    end

    subgraph Server["Next.js server (Node.js)"]
        direction TB
        Pages["Route: /<br/>app/page.jsx → MusicStudio"]
        API["API route handlers<br/>app/api/**"]
        DB["Mongo client<br/>db/index.js"]
        Seed["Demo seed<br/>lib/demo-library.js"]
        Boot["Mongo bootstrap<br/>lib/mongo-process.js"]
        Inst["instrumentation.js<br/>warm-up (non-blocking)"]

        Pages --> API
        API --> DB
        API --> Seed
        Inst --> Boot
        DB -.->|"retry if unreachable"| Boot
    end

    subgraph Data["MongoDB (only data store)"]
        T[("tracks<br/>metadata + audio Buffer")]
        F[("favorites")]
        P[("playlists<br/>embedded trackIds")]
    end

    UI -->|"fetch JSON"| API
    Audio -->|"GET /api/tracks/:id/audio<br/>HTTP Range"| API
    DB --> T
    DB --> F
    DB --> P
```

**Key properties**

| Property | Decision |
| --- | --- |
| Language | Plain JavaScript (`.js` / `.jsx`) — no TypeScript sources |
| Frontend | React 19 via Next.js App Router, one client component (`MusicStudio`) |
| Backend | Next.js Node.js route handlers (REST over `fetch`) |
| Database | MongoDB only (official `mongodb` driver, no ORM) |
| Audio storage | Binary `Buffer` inside the `tracks` document |
| Styling | Tailwind CSS v4 entry + hand-written CSS in `globals.css` |
| Auth | Single-user "listening room" — no accounts, no sessions |

---

## 2. Repository layout

```
src/
├── app/
│   ├── layout.jsx            # root layout + metadata
│   ├── page.jsx              # server entry → renders MusicStudio
│   ├── music-studio.jsx      # "use client" — whole UI + player + state
│   ├── globals.css           # design system, layouts, animations
│   └── api/
│       ├── health/route.js               # GET   MongoDB ping
│       ├── library/route.js              # GET   tracks + favorites + playlists
│       ├── tracks/route.js               # GET   list · POST upload (multipart)
│       ├── tracks/[id]/route.js          # DELETE uploaded track
│       ├── tracks/[id]/audio/route.js    # GET   stream audio (Range → 206)
│       ├── tracks/[id]/play/route.js     # POST  play counter ($inc)
│       ├── favorites/route.js            # GET   liked track ids
│       ├── favorites/[id]/route.js       # PUT / DELETE like
│       ├── playlists/route.js            # GET / POST collections
│       ├── playlists/[id]/route.js       # PATCH / DELETE collection
│       └── playlists/[id]/tracks/route.js# POST / DELETE membership
├── db/
│   └── index.js              # singleton MongoClient + typed collection helpers
├── lib/
│   ├── demo-library.js       # synthesises 6 original WAV previews on first run
│   └── mongo-process.js      # locate/start mongod, survive cold sandboxes
└── instrumentation.js        # background MongoDB warm-up at server boot
```

---

## 3. Data model

Two collections are relational-style (`_id` join), one embeds its members for cheap ordered reads.

```mermaid
erDiagram
    TRACKS {
        string _id PK "uuid"
        string title
        string artist
        string album
        string genre
        string artwork "cover mood key"
        int duration "seconds"
        int plays
        bool isDemo
        string fileName
        string mimeType
        int fileSize
        Buffer audio "binary audio data"
        Date createdAt
    }

    FAVORITES {
        string _id PK "= tracks._id"
        Date createdAt
    }

    PLAYLISTS {
        string _id PK "uuid"
        string name
        string description
        string artwork
        string_array trackIds "ordered track references"
        Date createdAt
    }

    TRACKS ||--o| FAVORITES : "liked as"
    TRACKS }o--o{ PLAYLISTS : "listed in trackIds"
```

**Notes**

- `tracks.audio` holds the raw file bytes; every other query uses a projection (`{ audio: 0 }`) so audio never crosses the wire as JSON.
- `favorites` uses the track id as its own `_id`, making likes idempotent (`upsert`).
- `playlists.trackIds` keeps insertion order and allows atomic `$addToSet` / `$pull`.
- Deleting a track is restricted to uploads (`isDemo: false`); favorites/playlist entries for that id simply no longer resolve.

---

## 4. Request lifecycle

### 4.1 First page load (read path)

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant B as Browser (React)
    participant N as Next.js server
    participant A as Library API
    participant S as demo-library.js
    participant M as MongoDB

    U->>B: open /
    B->>N: GET / (RSC render)
    N-->>B: HTML + client bundle
    B->>A: GET /api/library
    A->>M: ping via getDb()
    alt collection empty
        A->>S: seedDemoLibrary()
        S->>S: synthesise 6 WAV previews
        S->>M: insertMany(tracks)
    end
    A->>M: tracks.find (audio excluded) · favorites.find · playlists.find
    M-->>A: documents
    A-->>B: { tracks, favorites, playlists }
    B-->>U: render library, hero, queue
```

### 4.2 Audio streaming (read path, seekable)

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant B as Browser audio element
    participant A as Audio API
    participant M as MongoDB

    U->>B: press play / drag timeline
    B->>A: GET /api/tracks/:id/audio (Range: bytes=start-end)
    A->>M: findOne({_id}, {audio, mimeType, fileName})
    M-->>A: Buffer
    A-->>B: 206 Partial Content + Content-Range
    B-->>U: instant playback / seek
    Note over B,A: No Range header → 200 with full buffer
    Note over B: ended → next track (repeat/shuffle aware)
```

---

## 5. API surface

| Method | Route | Purpose | Collection touched |
| --- | --- | --- | --- |
| `GET` | `/api/health` | Health probe / DB ping | — |
| `GET` | `/api/library` | One-shot hydration payload | tracks, favorites, playlists |
| `GET` | `/api/tracks` | Track list (no audio) | tracks |
| `POST` | `/api/tracks` | Multipart upload ≤ 32 MB | tracks |
| `DELETE` | `/api/tracks/:id` | Delete own upload | tracks |
| `GET` | `/api/tracks/:id/audio` | Stream bytes, Range aware | tracks |
| `POST` | `/api/tracks/:id/play` | `$inc` play counter | tracks |
| `GET` | `/api/favorites` | Liked ids | favorites |
| `PUT` / `DELETE` | `/api/favorites/:id` | Like / unlike (idempotent) | favorites |
| `GET` / `POST` | `/api/playlists` | List / create collections | playlists |
| `PATCH` / `DELETE` | `/api/playlists/:id` | Rename / delete | playlists |
| `POST` / `DELETE` | `/api/playlists/:id/tracks` | Add / remove member | playlists |

Errors are JSON `{ "error": "human readable message" }` with `400` (validation), `403` (demo track delete), `404` (missing), `413` (file too large), `415` (unsupported audio), `500` (unexpected).

---

## 6. Client architecture

```mermaid
flowchart LR
    P["page.jsx<br/>(server)"] --> M["MusicStudio<br/>use client"]
    M --> V["View state<br/>view · search · genre · sort"]
    M --> D["Data state<br/>tracks · favorites · playlists"]
    M --> Y["Player state<br/>current · queue · time · volume"]
    M --> X["UI state<br/>modals · menus · toasts"]

    V --> R["Derived lists<br/>useMemo"]
    D --> R
    R --> C["Sections<br/>Discover · Library · Liked · Collection"]
    Y --> Dock["Player dock + queue panel"]

    M -->|fetch| API["/api/*"]
    Y -->|src| Stream["/api/tracks/:id/audio"]
```

Single source of truth in one client component keeps cross-feature actions (e.g. "add to collection" from a track row) instant. Lists are derived with `useMemo`; mutations use optimistic UI with rollback on failure.

---

## 7. MongoDB availability strategy

The hosted sandbox can cold-start with no database process. Two layers keep it working:

```mermaid
flowchart TD
    A["Server boot / first query"] --> B{"port 27017 open?"}
    B -->|yes| C["connect MongoClient (pooled singleton)"]
    B -->|no| D["resolve mongod binary<br/>bundled .gz → unpack · installed · PATH · download"]
    D --> E{"binary found?"}
    E -->|Linux/macOS| F["start detached<br/>--fork --dbpath .mongodb/data"]
    E -->|Windows| G["spawn detached<br/>installed mongod.exe"]
    E -->|no| H["log actionable hint<br/>install service or use Atlas URI"]
    F --> I["wait for port, then connect"]
    G --> I
    I --> J["retry once in db/index.js"]
    C --> K["queries served"]
    J --> K
```

- `instrumentation.js` warms MongoDB **in the background**, so the web server never blocks on it.
- A `mongodb+srv://` (Atlas) URI is detected as remote — no local start is attempted.

---

## 8. Security & limits

- Uploads validated by MIME type **and** extension; capped at **32 MB**; metadata fields trimmed and length-limited.
- `audio` is always excluded from JSON projections (never leaks into API payloads).
- Audio responses are `Cache-Control: private` and inline-disposition with an encoded filename.
- All database access is parameterised by the driver — no string-built queries.
- No secrets in the client bundle: only `MONGODB_URL` (server-side, git-ignored) is read.

---

## 9. Deliberate trade-offs

| Choice | Why | Cost |
| --- | --- | --- |
| Audio in MongoDB | One data store, zero external services | 16 MB doc limit → upload cap, no CDN caching |
| Single client component | Fast cross-feature state, fewer files | large file; would split by context at scale |
| Embedded `trackIds` | Ordered membership, atomic add/remove | denormalised; no join metadata per entry |
| Generated demo tracks | Works instantly on a fresh clone | ~1.8 MB seeded on first visit |
| No auth | Personal listening room | not multi-tenant; would need sessions + user scoping |

**Next steps if this grew:** GridFS or object storage for large audio, indexes on `tracks.createdAt`, `tracks.title`, auth + per-user collections, and paginated library queries.
