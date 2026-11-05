"use client";
import { Activity, ArrowLeft, ArrowRight, AudioLines, Check, ChevronDown, ChevronRight, Clock3, Compass, Disc3, Heart, Headphones, Library, ListMusic, LoaderCircle, Menu, MoreHorizontal, Moon, Music2, Pause, Play, Plus, Radio, Repeat, Repeat1, Search, Shuffle, SkipBack, SkipForward, Sparkles, SunMedium, Trash2, Upload, Volume2, VolumeX, Waves, X, } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, } from "react";
const genreFilters = ["All styles", "Indie pop", "Electronic", "Dream pop", "Soul", "Ambient"];
const artworkOptions = ["dawn", "afterglow", "amber", "ocean", "rose", "night", "mint", "lilac"];
const artworkColors = {
    dawn: "linear-gradient(135deg, #e7b276, #fa788e)",
    afterglow: "linear-gradient(135deg, #ff9d70, #5a48d6)",
    amber: "linear-gradient(135deg, #f7bb62, #e76b43)",
    ocean: "linear-gradient(135deg, #65d5ce, #4b65c7)",
    rose: "linear-gradient(135deg, #f39aa9, #a358a2)",
    night: "linear-gradient(135deg, #605ab8, #282642)",
    mint: "linear-gradient(135deg, #b8e78c, #3c9d8c)",
    lilac: "linear-gradient(135deg, #bc9dff, #ee9bd0)",
};
const genreTiles = [
    { name: "Indie pop", label: "Soft focus", description: "A little sunlight, wherever you are.", icon: SunMedium, className: "mood--sunrise" },
    { name: "Electronic", label: "After hours", description: "For the city after it goes quiet.", icon: Moon, className: "mood--afterhours" },
    { name: "Dream pop", label: "Blue skies", description: "Float somewhere softer for a while.", icon: Waves, className: "mood--blue" },
    { name: "Soul", label: "Feel something", description: "Warm notes for the way back home.", icon: Activity, className: "mood--soul" },
];
const sortLabels = {
    featured: "Featured",
    recent: "Recently added",
    popular: "Most played",
    title: "A — Z",
};
function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0)
        return "0:00";
    const value = Math.floor(seconds);
    return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
}
function formatCount(count) {
    return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(count);
}
function Artwork({ variant = "lilac", className = "" }) {
    return (<div className={`artwork art--${variant} ${className}`} aria-hidden="true">
      <span className="artwork__halo"/>
      <span className="artwork__orb"/>
      <span className="artwork__orbit"/>
      <span className="artwork__spark"/>
      <span className="artwork__grain"/>
      <span className="artwork__stamp">S</span>
    </div>);
}
export function MusicStudio() {
    const [tracks, setTracks] = useState([]);
    const [playlists, setPlaylists] = useState([]);
    const [favoriteIds, setFavoriteIds] = useState(new Set());
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [view, setView] = useState("home");
    const [activePlaylistId, setActivePlaylistId] = useState("");
    const [search, setSearch] = useState("");
    const [genre, setGenre] = useState("All styles");
    const [sortBy, setSortBy] = useState("featured");
    const [menuTrackId, setMenuTrackId] = useState("");
    const [modal, setModal] = useState(null);
    const [toast, setToast] = useState("");
    const [rightOpen, setRightOpen] = useState(true);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [currentTrack, setCurrentTrack] = useState(null);
    const [queue, setQueue] = useState([]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(0.78);
    const [shuffle, setShuffle] = useState(false);
    const [repeat, setRepeat] = useState("off");
    const [uploadFile, setUploadFile] = useState(null);
    const [uploadTitle, setUploadTitle] = useState("");
    const [uploadArtist, setUploadArtist] = useState("");
    const [uploadAlbum, setUploadAlbum] = useState("");
    const [uploadGenre, setUploadGenre] = useState("Indie pop");
    const [uploadArtwork, setUploadArtwork] = useState("lilac");
    const [uploadDuration, setUploadDuration] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [playlistName, setPlaylistName] = useState("");
    const [playlistDescription, setPlaylistDescription] = useState("");
    const [isSavingPlaylist, setIsSavingPlaylist] = useState(false);
    const audioRef = useRef(null);
    const searchRef = useRef(null);
    const notify = useCallback((message) => setToast(message), []);
    const loadLibrary = useCallback(async () => {
        try {
            setLoadError("");
            const response = await fetch("/api/library", { cache: "no-store" });
            if (!response.ok)
                throw new Error("The listening room is taking a little longer to load.");
            const data = (await response.json());
            setTracks(data.tracks);
            setFavoriteIds(new Set(data.favorites));
            setPlaylists(data.playlists);
        }
        catch (error) {
            setLoadError(error instanceof Error ? error.message : "Couldn't load your music just now.");
        }
        finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => {
        void loadLibrary();
    }, [loadLibrary]);
    useEffect(() => {
        if (!toast)
            return;
        const timeout = window.setTimeout(() => setToast(""), 3200);
        return () => window.clearTimeout(timeout);
    }, [toast]);
    useEffect(() => {
        if (audioRef.current)
            audioRef.current.volume = volume;
    }, [volume]);
    useEffect(() => {
        const onKeyDown = (event) => {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
                event.preventDefault();
                searchRef.current?.focus();
            }
            if (event.key === "Escape") {
                setModal(null);
                setMenuTrackId("");
                setMobileMenuOpen(false);
            }
            if (event.code === "Space" && !(event.target instanceof HTMLInputElement) && !(event.target instanceof HTMLTextAreaElement)) {
                event.preventDefault();
                togglePlayback();
            }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    });
    const selectedPlaylist = playlists.find((playlist) => playlist.id === activePlaylistId);
    const visibleTracks = useMemo(() => {
        let result = [...tracks];
        if (view === "liked")
            result = result.filter((track) => favoriteIds.has(track.id));
        if (view === "playlist" && selectedPlaylist) {
            const positions = new Map(selectedPlaylist.trackIds.map((id, index) => [id, index]));
            result = result.filter((track) => positions.has(track.id));
            result.sort((a, b) => (positions.get(a.id) ?? 0) - (positions.get(b.id) ?? 0));
        }
        if (genre !== "All styles")
            result = result.filter((track) => track.genre.toLowerCase() === genre.toLowerCase());
        if (search.trim()) {
            const term = search.trim().toLowerCase();
            result = result.filter((track) => [track.title, track.artist, track.album, track.genre].some((value) => value.toLowerCase().includes(term)));
        }
        if (sortBy === "recent" && view !== "playlist") {
            result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }
        if (sortBy === "popular" && view !== "playlist")
            result.sort((a, b) => b.plays - a.plays);
        if (sortBy === "title")
            result.sort((a, b) => a.title.localeCompare(b.title));
        return result;
    }, [favoriteIds, genre, search, selectedPlaylist, sortBy, tracks, view]);
    const popularTracks = useMemo(() => [...tracks].sort((a, b) => b.plays - a.plays), [tracks]);
    const featuredTrack = popularTracks[1] ?? popularTracks[0] ?? null;
    const homeRows = search || genre !== "All styles" ? visibleTracks : popularTracks.slice(0, 5);
    const queueAfterCurrent = useMemo(() => {
        if (!currentTrack)
            return queue.slice(0, 5);
        const currentIndex = queue.findIndex((track) => track.id === currentTrack.id);
        return currentIndex < 0 ? queue.slice(0, 5) : queue.slice(currentIndex + 1, currentIndex + 6);
    }, [currentTrack, queue]);
    function chooseView(nextView, playlistId = "") {
        setView(nextView);
        setActivePlaylistId(playlistId);
        setSearch("");
        setGenre("All styles");
        setMenuTrackId("");
        setMobileMenuOpen(false);
    }
    function setSearchQuery(value) {
        setSearch(value);
        if (value.trim())
            setView("search");
        else if (view === "search")
            setView("home");
    }
    function playTrack(track, sourceQueue = tracks) {
        const nextQueue = sourceQueue.length ? sourceQueue : [track];
        setQueue(nextQueue);
        setCurrentTrack(track);
        setCurrentTime(0);
        setDuration(track.duration);
        const player = audioRef.current;
        if (player) {
            player.pause();
            player.src = `/api/tracks/${track.id}/audio`;
            player.load();
            void player.play().catch(() => {
                setIsPlaying(false);
                notify("This track couldn't be played. Try another one.");
            });
        }
        setTracks((current) => current.map((item) => (item.id === track.id ? { ...item, plays: item.plays + 1 } : item)));
        void fetch(`/api/tracks/${track.id}/play`, { method: "POST" }).catch(() => undefined);
    }
    function togglePlayback() {
        const player = audioRef.current;
        if (!currentTrack) {
            const firstTrack = popularTracks[0];
            if (firstTrack)
                playTrack(firstTrack, popularTracks);
            return;
        }
        if (!player)
            return;
        if (player.paused) {
            if (!player.src || !player.src.includes(`/api/tracks/${currentTrack.id}/audio`)) {
                player.src = `/api/tracks/${currentTrack.id}/audio`;
                player.load();
            }
            void player.play().catch(() => notify("This track couldn't be played. Try another one."));
        }
        else {
            player.pause();
        }
    }
    function playNext() {
        if (!currentTrack || queue.length === 0)
            return;
        if (repeat === "one") {
            const player = audioRef.current;
            if (player) {
                player.currentTime = 0;
                void player.play().catch(() => setIsPlaying(false));
            }
            return;
        }
        if (shuffle && queue.length > 1) {
            const options = queue.filter((track) => track.id !== currentTrack.id);
            const next = options[Math.floor(Math.random() * options.length)];
            if (next)
                playTrack(next, queue);
            return;
        }
        const currentIndex = queue.findIndex((track) => track.id === currentTrack.id);
        const next = currentIndex >= 0 ? queue[currentIndex + 1] : queue[0];
        if (next)
            playTrack(next, queue);
        else if (repeat === "all" && queue[0])
            playTrack(queue[0], queue);
        else {
            setIsPlaying(false);
            if (audioRef.current)
                audioRef.current.pause();
        }
    }
    function playPrevious() {
        const player = audioRef.current;
        if (player && player.currentTime > 4) {
            player.currentTime = 0;
            setCurrentTime(0);
            return;
        }
        if (!currentTrack || queue.length === 0)
            return;
        const currentIndex = queue.findIndex((track) => track.id === currentTrack.id);
        const previous = currentIndex > 0
            ? queue[currentIndex - 1]
            : repeat === "all"
                ? queue[queue.length - 1]
                : currentTrack;
        playTrack(previous, queue);
    }
    async function toggleFavorite(track) {
        const wasFavorite = favoriteIds.has(track.id);
        setFavoriteIds((current) => {
            const next = new Set(current);
            if (wasFavorite)
                next.delete(track.id);
            else
                next.add(track.id);
            return next;
        });
        try {
            const response = await fetch(`/api/favorites/${track.id}`, { method: wasFavorite ? "DELETE" : "PUT" });
            if (!response.ok)
                throw new Error("That change didn't stick.");
            notify(wasFavorite ? "Removed from the songs you love." : "Saved to your liked songs.");
        }
        catch {
            setFavoriteIds((current) => {
                const next = new Set(current);
                if (wasFavorite)
                    next.add(track.id);
                else
                    next.delete(track.id);
                return next;
            });
            notify("Couldn't update your liked songs. Try again.");
        }
    }
    async function addToPlaylist(track, playlist) {
        try {
            const response = await fetch(`/api/playlists/${playlist.id}/tracks`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ trackId: track.id }),
            });
            if (!response.ok)
                throw new Error("Couldn't add this track.");
            setPlaylists((current) => current.map((item) => item.id === playlist.id && !item.trackIds.includes(track.id)
                ? { ...item, trackIds: [...item.trackIds, track.id] }
                : item));
            setMenuTrackId("");
            notify(`Added to ${playlist.name}.`);
        }
        catch {
            notify("Couldn't add this track to the playlist.");
        }
    }
    async function removeFromPlaylist(track) {
        if (!selectedPlaylist)
            return;
        try {
            const response = await fetch(`/api/playlists/${selectedPlaylist.id}/tracks`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ trackId: track.id }),
            });
            if (!response.ok)
                throw new Error("Couldn't remove this track.");
            setPlaylists((current) => current.map((item) => item.id === selectedPlaylist.id
                ? { ...item, trackIds: item.trackIds.filter((id) => id !== track.id) }
                : item));
            setMenuTrackId("");
            notify("Removed from this collection.");
        }
        catch {
            notify("Couldn't remove this track.");
        }
    }
    async function deleteTrack(track) {
        try {
            const response = await fetch(`/api/tracks/${track.id}`, { method: "DELETE" });
            const data = (await response.json());
            if (!response.ok)
                throw new Error(data.error ?? "Couldn't delete this track.");
            if (currentTrack?.id === track.id) {
                audioRef.current?.pause();
                setCurrentTrack(null);
                setIsPlaying(false);
            }
            setMenuTrackId("");
            await loadLibrary();
            notify("Your upload has been removed.");
        }
        catch (error) {
            notify(error instanceof Error ? error.message : "Couldn't remove that upload.");
        }
    }
    function chooseUploadFile(file) {
        setUploadFile(file);
        setUploadDuration(0);
        if (!file)
            return;
        const withoutExtension = file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
        setUploadTitle(withoutExtension || "Untitled track");
        const url = URL.createObjectURL(file);
        const probe = document.createElement("audio");
        probe.preload = "metadata";
        probe.onloadedmetadata = () => {
            if (Number.isFinite(probe.duration))
                setUploadDuration(Math.round(probe.duration));
            URL.revokeObjectURL(url);
        };
        probe.onerror = () => URL.revokeObjectURL(url);
        probe.src = url;
    }
    async function submitUpload(event) {
        event.preventDefault();
        if (!uploadFile) {
            notify("Drop a song in first, then we can make it yours.");
            return;
        }
        if (!uploadTitle.trim() || !uploadArtist.trim()) {
            notify("Add a track title and artist name.");
            return;
        }
        setIsUploading(true);
        const form = new FormData();
        form.append("audio", uploadFile);
        form.append("title", uploadTitle.trim());
        form.append("artist", uploadArtist.trim());
        form.append("album", uploadAlbum.trim() || "Single");
        form.append("genre", uploadGenre);
        form.append("artwork", uploadArtwork);
        form.append("duration", String(uploadDuration));
        try {
            const response = await fetch("/api/tracks", { method: "POST", body: form });
            const data = (await response.json());
            if (!response.ok)
                throw new Error("error" in data && data.error ? data.error : "Your song couldn't be saved.");
            await loadLibrary();
            setModal(null);
            setUploadFile(null);
            setUploadTitle("");
            setUploadArtist("");
            setUploadAlbum("");
            setUploadDuration(0);
            notify("Your song is home. Looking good.");
        }
        catch (error) {
            notify(error instanceof Error ? error.message : "Your song couldn't be saved.");
        }
        finally {
            setIsUploading(false);
        }
    }
    async function submitPlaylist(event) {
        event.preventDefault();
        if (!playlistName.trim()) {
            notify("Your collection needs a name.");
            return;
        }
        setIsSavingPlaylist(true);
        try {
            const response = await fetch("/api/playlists", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: playlistName.trim(), description: playlistDescription.trim() }),
            });
            const data = (await response.json());
            if (!response.ok)
                throw new Error("error" in data && data.error ? data.error : "Playlist couldn't be created.");
            const playlist = data;
            setPlaylists((current) => [playlist, ...current]);
            setPlaylistName("");
            setPlaylistDescription("");
            setModal(null);
            chooseView("playlist", playlist.id);
            notify("A new little collection, just for you.");
        }
        catch (error) {
            notify(error instanceof Error ? error.message : "Playlist couldn't be created.");
        }
        finally {
            setIsSavingPlaylist(false);
        }
    }
    async function deletePlaylist(playlist) {
        try {
            const response = await fetch(`/api/playlists/${playlist.id}`, { method: "DELETE" });
            if (!response.ok)
                throw new Error("Couldn't remove this playlist.");
            setPlaylists((current) => current.filter((item) => item.id !== playlist.id));
            if (activePlaylistId === playlist.id)
                chooseView("library");
            notify(`“${playlist.name}” has been removed.`);
        }
        catch {
            notify("Couldn't remove this playlist.");
        }
    }
    function cycleSort() {
        const options = ["featured", "recent", "popular", "title"];
        setSortBy(options[(options.indexOf(sortBy) + 1) % options.length]);
    }
    const title = view === "liked"
        ? "Liked songs"
        : view === "playlist"
            ? selectedPlaylist?.name ?? "Your collection"
            : view === "search"
                ? "A sound for that feeling"
                : view === "library"
                    ? "Your music, your rules."
                    : "The listening room";
    const currentCollectionTracks = view === "home" ? homeRows : visibleTracks;
    function renderTrackRows(items) {
        if (items.length === 0) {
            return (<div className="empty-state empty-state--compact">
          <div className="empty-state__icon"><Music2 size={19}/></div>
          <p>{view === "liked" ? "Your favorites will feel right at home here." : "No tracks here just yet. Add a song of your own."}</p>
          <button className="text-button" onClick={() => setModal("upload")}><Plus size={14}/> Add a song</button>
        </div>);
        }
        return (<div className="track-table" role="table" aria-label="Your music">
        <div className="track-table__head" role="row">
          <span>#</span><span>Track</span><span>Album</span><span>Style</span><span></span><span><Clock3 size={13}/></span><span></span>
        </div>
        {items.map((track, index) => {
                const isActive = currentTrack?.id === track.id;
                const liked = favoriteIds.has(track.id);
                return (<div className={`track-row ${isActive ? "track-row--active" : ""}`} role="row" key={track.id}>
              <button className="track-row__index" aria-label={isActive && isPlaying ? `Pause ${track.title}` : `Play ${track.title}`} onClick={() => isActive ? togglePlayback() : playTrack(track, currentCollectionTracks)}>
                {isActive && isPlaying ? <AudioLines size={17} className="playing-bars"/> : <><span>{String(index + 1).padStart(2, "0")}</span><Play size={16} fill="currentColor" className="track-row__play-icon"/></>}
              </button>
              <div className="track-row__song">
                <Artwork variant={track.artwork} className="track-row__cover"/>
                <div className="track-row__text">
                  <span className="track-row__title">{track.title}</span>
                  <span className="track-row__artist">{track.artist}{track.isDemo && <span className="demo-dot"> · room original</span>}</span>
                </div>
              </div>
              <span className="track-row__album">{track.album}</span>
              <span className="track-row__genre">{track.genre}</span>
              <button className={`icon-button track-row__heart ${liked ? "is-liked" : ""}`} aria-label={liked ? `Remove ${track.title} from liked songs` : `Like ${track.title}`} onClick={() => void toggleFavorite(track)}>
                <Heart size={16} fill={liked ? "currentColor" : "none"}/>
              </button>
              <span className="track-row__duration">{formatTime(track.duration)}</span>
              <div className="track-row__more-wrap">
                <button className="icon-button track-row__more" aria-label={`More options for ${track.title}`} onClick={() => setMenuTrackId(menuTrackId === track.id ? "" : track.id)}><MoreHorizontal size={18}/></button>
                {menuTrackId === track.id && (<div className="track-menu">
                    <span className="track-menu__label">Add to a collection</span>
                    {playlists.length ? playlists.map((playlist) => (<button key={playlist.id} onClick={() => void addToPlaylist(track, playlist)}>
                        <ListMusic size={15}/> <span>{playlist.name}</span>
                        {playlist.trackIds.includes(track.id) && <Check size={14} className="track-menu__check"/>}
                      </button>)) : <p className="track-menu__empty">Make a collection first.</p>}
                    {view === "playlist" && selectedPlaylist && <button onClick={() => void removeFromPlaylist(track)}><X size={15}/><span>Remove from this collection</span></button>}
                    {!track.isDemo && <button className="track-menu__danger" onClick={() => void deleteTrack(track)}><Trash2 size={15}/><span>Delete your upload</span></button>}
                  </div>)}
              </div>
            </div>);
            })}
      </div>);
    }
    return (<main className={`app-shell ${rightOpen ? "app-shell--right-open" : ""}`}>
      <aside className={`sidebar sidebar--left ${mobileMenuOpen ? "sidebar--mobile-open" : ""}`}>
        <a href="#home" className="brand-lockup" onClick={(event) => { event.preventDefault(); chooseView("home"); }}>
          <span className="brand-mark"><AudioLines size={22} strokeWidth={2.4}/></span>
          <span className="brand-copy"><strong>stillroom</strong><small>MUSIC, MEANINGFULLY</small></span>
        </a>

        <div className="sidebar-nav">
          <span className="sidebar-label">YOUR SPACE</span>
          <button className={`sidebar-link ${view === "home" || view === "search" ? "is-selected" : ""}`} onClick={() => chooseView("home")}>
            <Compass size={18}/><span>Discover</span><span className="nav-spark">✳</span>
          </button>
          <button className={`sidebar-link ${view === "library" ? "is-selected" : ""}`} onClick={() => chooseView("library")}>
            <Library size={18}/><span>Your library</span><span className="sidebar-link__count">{tracks.length || "—"}</span>
          </button>
          <button className={`sidebar-link ${view === "liked" ? "is-selected" : ""}`} onClick={() => chooseView("liked")}>
            <Heart size={18}/><span>Liked songs</span><span className="sidebar-link__count">{favoriteIds.size || ""}</span>
          </button>
        </div>

        <div className="sidebar-playlists">
          <div className="sidebar-label-row"><span className="sidebar-label">YOUR COLLECTIONS</span><button className="icon-button sidebar-add" aria-label="Create a playlist" onClick={() => setModal("playlist")}><Plus size={16}/></button></div>
          <button className="create-collection" onClick={() => setModal("playlist")}><span className="create-collection__plus"><Plus size={14}/></span><span>New collection</span></button>
          <div className="playlist-list">
            {playlists.map((playlist) => (<button className={`playlist-link ${view === "playlist" && activePlaylistId === playlist.id ? "is-selected" : ""}`} key={playlist.id} onClick={() => chooseView("playlist", playlist.id)}>
                <Artwork variant={playlist.artwork} className="playlist-link__art"/>
                <span className="playlist-link__copy"><strong>{playlist.name}</strong><small>{playlist.trackIds.length} {playlist.trackIds.length === 1 ? "track" : "tracks"}</small></span>
                <ChevronRight size={14} className="playlist-link__chevron"/>
              </button>))}
            {playlists.length === 0 && <p className="sidebar-empty">Your first mix is one click away.</p>}
          </div>
        </div>

        <div className="sidebar-bottom">
          <div className="sidebar-note"><span className="note-orb"><Headphones size={16}/></span><span><strong>Good sound, no noise.</strong><small>Your music stays yours.</small></span></div>
          <div className="profile-chip"><span className="profile-avatar">Y</span><span className="profile-copy"><strong>Your listening room</strong><small>Just you, and the music</small></span><span className="online-dot"/></div>
        </div>
      </aside>

      <section className="main-panel" id="home">
        <header className="topbar">
          <div className="topbar__left">
            <button className="icon-button mobile-menu-button" aria-label="Open navigation" onClick={() => setMobileMenuOpen((open) => !open)}><Menu size={19}/></button>
            <div className="history-buttons">
              <button className="icon-button" aria-label="Go to discover" onClick={() => chooseView("home")}><ArrowLeft size={17}/></button>
              <button className="icon-button" aria-label="Go to your library" onClick={() => chooseView("library")}><ArrowRight size={17}/></button>
            </div>
            <label className="search-box">
              <Search size={17}/>
              <input ref={searchRef} value={search} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Find a song, an artist, a feeling..." aria-label="Search your music"/>
              {search ? <button className="search-clear" aria-label="Clear search" onClick={() => setSearchQuery("")}><X size={14}/></button> : <kbd>⌘ K</kbd>}
            </label>
          </div>
          <div className="topbar__right">
            <button className="right-toggle icon-button" aria-label={rightOpen ? "Hide now playing panel" : "Show now playing panel"} onClick={() => setRightOpen((open) => !open)}><Disc3 size={18}/></button>
            <button className="upload-button" onClick={() => setModal("upload")}><Upload size={15}/><span>Add your music</span><span className="upload-plus">+</span></button>
            <div className="top-avatar">Y</div>
          </div>
        </header>

        <div className="main-scroll">
          {loadError && <div className="load-error"><span>{loadError}</span><button className="text-button" onClick={() => void loadLibrary()}>Try again</button></div>}

          {view === "home" && !search && genre === "All styles" ? (<>
              <div className="greeting-line"><span className="eyebrow-dot"/>A BETTER KIND OF BACKGROUND MUSIC</div>
              <section className="hero-card">
                <div className="hero-card__copy">
                  <span className="hero-kicker"><Sparkles size={13}/> YOUR OWN LITTLE UNIVERSE</span>
                  <h1>Find your<br /><em>frequency.</em></h1>
                  <p>Music for the in-between. Your own songs, your own soundtrack, your own room to feel something.</p>
                  <div className="hero-card__actions">
                    <button className="hero-play" onClick={() => featuredTrack && playTrack(featuredTrack, popularTracks)} disabled={!featuredTrack || loading}>
                      <Play size={15} fill="currentColor"/> <span>Press play</span>
                    </button>
                    <button className="hero-subtle-button" onClick={() => setModal("upload")}><Plus size={15}/> Your first upload</button>
                  </div>
                  <div className="hero-caption"><span className="hero-caption__line"/>A listening experience that knows you own the music.</div>
                </div>
                <div className="hero-card__visual" aria-hidden="true">
                  <div className="hero-visual-orbit hero-visual-orbit--one"/>
                  <div className="hero-visual-orbit hero-visual-orbit--two"/>
                  {featuredTrack ? <Artwork variant={featuredTrack.artwork} className="hero-artwork"/> : <Artwork variant="afterglow" className="hero-artwork"/>}
                  <div className="hero-floating-note hero-floating-note--one"><AudioLines size={16}/><span>your frequency</span></div>
                  <div className="hero-floating-note hero-floating-note--two"><span className="hero-note-bars"><i /><i /><i /><i /></span><span>in the moment</span></div>
                  <div className="hero-index">S / 01&nbsp; · &nbsp;STILLROOM SESSIONS</div>
                </div>
                <div className="hero-card__grain"/>
              </section>

              <div className="quick-stats">
                <div><span className="quick-stat-icon"><Music2 size={14}/></span><span><strong>{tracks.length}</strong> tracks in your room</span></div>
                <span className="quick-stats__divider"/>
                <div><span className="quick-stat-icon quick-stat-icon--peach"><Heart size={14}/></span><span><strong>{favoriteIds.size}</strong> songs you love</span></div>
                <span className="quick-stats__divider"/>
                <div><span className="quick-stat-icon quick-stat-icon--blue"><ListMusic size={14}/></span><span><strong>{playlists.length}</strong> personal collections</span></div>
              </div>

              <section className="content-section picks-section">
                <div className="section-heading"><div><span className="eyebrow">A GOOD PLACE TO START</span><h2>Little things you might love<span className="section-star">✳</span></h2></div><button className="section-link" onClick={() => chooseView("library")}>Your whole library <ChevronRight size={15}/></button></div>
                {loading ? <div className="loading-cards"><span /><span /><span /><span /></div> : (<div className="picks-grid">
                    {popularTracks.slice(0, 4).map((track, index) => (<button className="pick-card" key={track.id} onClick={() => playTrack(track, popularTracks)}>
                        <div className="pick-card__cover-wrap"><Artwork variant={track.artwork} className="pick-card__cover"/><span className="pick-card__index">0{index + 1}</span><span className="pick-card__play"><Play size={16} fill="currentColor"/></span></div>
                        <span className="pick-card__title">{track.title}</span><span className="pick-card__artist">{track.artist} <span>·</span> {track.genre}</span>
                      </button>))}
                  </div>)}
              </section>

              <section className="content-section mood-section">
                <div className="section-heading"><div><span className="eyebrow">MEET YOUR NEXT MOOD</span><h2>Where are we going?</h2></div></div>
                <div className="mood-grid">
                  {genreTiles.map((tile) => {
                const Icon = tile.icon;
                return <button className={`mood-card ${tile.className}`} key={tile.name} onClick={() => { setGenre(tile.name); setView("library"); setSearch(""); }}><span className="mood-card__icon"><Icon size={18}/></span><span className="mood-card__name">{tile.label}</span><span className="mood-card__description">{tile.description}</span><span className="mood-card__arrow"><ArrowRight size={16}/></span></button>;
            })}
                </div>
              </section>

              <section className="content-section rotation-section">
                <div className="section-heading"><div><span className="eyebrow">THE CURRENT ROTATION</span><h2>Coming around again</h2></div><button className="section-link" onClick={() => { chooseView("library"); setSortBy("popular"); }}>See all the good stuff <ChevronRight size={15}/></button></div>
                {renderTrackRows(homeRows)}
              </section>
              <footer className="main-footer"><span className="footer-mark">S</span><span>For the love of the little things.</span><span className="footer-right">STILLROOM&nbsp; · &nbsp;MADE FOR YOUR MUSIC</span></footer>
            </>) : (<>
              <div className="collection-heading">
                <div className="collection-heading__topline"><span className="eyebrow-dot"/>{view === "liked" ? "THE SONGS THAT FOUND YOU" : view === "playlist" ? "YOUR PERSONAL COLLECTION" : view === "search" ? "A LITTLE MUSICAL SERENDIPITY" : "YOUR MUSIC, YOUR RULES"}</div>
                <div className="collection-heading__row">
                  <div><h1>{title}</h1><p>{view === "liked" ? `${visibleTracks.length} songs worth keeping close.` : view === "playlist" ? selectedPlaylist?.description || `${visibleTracks.length} songs, all in one place.` : view === "search" ? "Search the music you've saved, added, and made your own." : "Every song you add, right where it belongs."}</p></div>
                  <div className="collection-heading__actions">
                    {view === "playlist" && selectedPlaylist && <button className="icon-button collection-delete" aria-label="Delete playlist" title="Delete playlist" onClick={() => void deletePlaylist(selectedPlaylist)}><Trash2 size={17}/></button>}
                    <button className="hero-play collection-play" onClick={() => currentCollectionTracks[0] && playTrack(currentCollectionTracks[0], currentCollectionTracks)} disabled={!currentCollectionTracks.length}><Play size={15} fill="currentColor"/> Play all</button>
                    <button className="collection-shuffle icon-button" aria-label="Shuffle this collection" onClick={() => { setShuffle(true); if (currentCollectionTracks[0])
            playTrack(currentCollectionTracks[Math.floor(Math.random() * currentCollectionTracks.length)], currentCollectionTracks); }}><Shuffle size={17}/></button>
                  </div>
                </div>
                {view === "liked" && <div className="liked-banner"><span className="liked-banner__heart"><Heart size={19} fill="currentColor"/></span><div><strong>{visibleTracks.length ? "A few songs that know you." : "Your soft spot for songs starts here."}</strong><span>Tap a heart anywhere to keep a song close.</span></div><span className="liked-banner__spark">✳</span></div>}
              </div>

              <section className="content-section library-section">
                <div className="library-toolbar">
                  <div className="filter-chips" role="group" aria-label="Filter by style">
                    {genreFilters.map((filter) => <button className={`filter-chip ${genre === filter ? "is-active" : ""}`} key={filter} onClick={() => setGenre(filter)}>{filter}</button>)}
                  </div>
                  <button className="sort-button" onClick={cycleSort}><span>Sort</span><strong>{sortLabels[sortBy]}</strong><ChevronDown size={14}/></button>
                </div>
                {loading ? <div className="table-skeleton"><span /><span /><span /><span /></div> : renderTrackRows(currentCollectionTracks)}
              </section>
              <div className="library-bottom-note"><Disc3 size={14}/> Your library is yours. Add any song and keep the good ones close.</div>
              <footer className="main-footer"><span className="footer-mark">S</span><span>For the love of the little things.</span><span className="footer-right">STILLROOM&nbsp; · &nbsp;MADE FOR YOUR MUSIC</span></footer>
            </>)}
        </div>

        <nav className="mobile-nav" aria-label="Main navigation">
          <button className={view === "home" ? "is-selected" : ""} onClick={() => chooseView("home")}><Compass size={17}/><span>Home</span></button>
          <button className={view === "library" ? "is-selected" : ""} onClick={() => chooseView("library")}><Library size={17}/><span>Library</span></button>
          <button className={view === "liked" ? "is-selected" : ""} onClick={() => chooseView("liked")}><Heart size={17}/><span>Liked</span></button>
        </nav>
      </section>

      <aside className={`sidebar sidebar--right ${rightOpen ? "sidebar--right-visible" : ""}`}>
        <div className="right-panel-header"><span>YOUR NOW PLAYING</span><button className="icon-button" aria-label="Close now playing panel" onClick={() => setRightOpen(false)}><X size={16}/></button></div>
        {currentTrack ? (<>
            <div className="now-playing-art-wrap"><Artwork variant={currentTrack.artwork} className="now-playing-art"/><span className="now-playing-glow"/></div>
            <div className="now-playing-info"><div><h2>{currentTrack.title}</h2><p>{currentTrack.artist}</p></div><button className={`icon-button now-playing-heart ${favoriteIds.has(currentTrack.id) ? "is-liked" : ""}`} aria-label="Like current song" onClick={() => void toggleFavorite(currentTrack)}><Heart size={19} fill={favoriteIds.has(currentTrack.id) ? "currentColor" : "none"}/></button></div>
            <div className="now-playing-album"><span>{currentTrack.album}</span><span className="now-playing-album__dot">·</span><span>{currentTrack.genre}</span></div>
            <div className="side-feature-note"><span className="side-feature-note__icon"><AudioLines size={15}/></span><span><strong>A song in your own words.</strong><small>Part of your personal universe.</small></span><span className="side-feature-note__wave"><i /><i /><i /></span></div>
          </>) : (<div className="now-playing-empty"><div className="now-playing-empty__art"><Artwork variant="afterglow"/></div><span className="eyebrow">YOUR NEXT LITTLE ESCAPE</span><h2>Let something<br />find you.</h2><p>Pick a song from your room. We&apos;ll keep this space warm.</p><button className="text-button" onClick={() => chooseView("home")}>Explore your music <ArrowRight size={14}/></button></div>)}

        <div className="queue-section">
          <div className="queue-heading"><div><span className="eyebrow">UP NEXT</span><h3>Your queue</h3></div><button className="queue-count" title={`${queue.length} tracks`}>{queue.length}<ChevronDown size={13}/></button></div>
          {queueAfterCurrent.length ? (<div className="queue-list">{queueAfterCurrent.slice(0, 5).map((track, index) => (<button className="queue-track" key={track.id} onClick={() => playTrack(track, queue)}>
                <span className="queue-track__number">{String(index + 1).padStart(2, "0")}</span><Artwork variant={track.artwork} className="queue-track__art"/><span className="queue-track__copy"><strong>{track.title}</strong><small>{track.artist}</small></span><span className="queue-track__time">{formatTime(track.duration)}</span>
              </button>))}</div>) : (<div className="queue-empty"><div className="queue-empty__line"><span /><span /><span /></div><p>{queue.length ? "You've reached the end of the queue." : "Your next favorite is only a little way away."}</p></div>)}
        </div>
        <div className="right-panel-footer"><Radio size={14}/><span>Only music that feels like you.</span><span className="right-panel-footer__dot"/></div>
      </aside>

      <section className="player-dock" aria-label="Music player">
        <div className="player__identity">
          {currentTrack ? <>
            <Artwork variant={currentTrack.artwork} className="player__art"/>
            <div className="player__track"><strong>{currentTrack.title}</strong><span>{currentTrack.artist}</span></div>
            <button className={`icon-button player__like ${favoriteIds.has(currentTrack.id) ? "is-liked" : ""}`} aria-label={favoriteIds.has(currentTrack.id) ? "Unlike track" : "Like track"} onClick={() => void toggleFavorite(currentTrack)}><Heart size={16} fill={favoriteIds.has(currentTrack.id) ? "currentColor" : "none"}/></button>
          </> : <>
            <span className="player__placeholder"><Music2 size={19}/></span><div className="player__track"><strong>A little room for sound</strong><span>Choose something that feels like you.</span></div>
          </>}
        </div>
        <div className="player__center">
          <div className="player__controls">
            <button className={`player-control player-control--subtle ${shuffle ? "is-on" : ""}`} aria-label="Toggle shuffle" onClick={() => setShuffle((value) => !value)}><Shuffle size={16}/></button>
            <button className="player-control" aria-label="Previous track" onClick={playPrevious}><SkipBack size={18} fill="currentColor"/></button>
            <button className="player-play" aria-label={isPlaying ? "Pause" : "Play"} onClick={togglePlayback}>{isPlaying ? <Pause size={18} fill="currentColor"/> : <Play size={18} fill="currentColor"/>}</button>
            <button className="player-control" aria-label="Next track" onClick={playNext}><SkipForward size={18} fill="currentColor"/></button>
            <button className={`player-control player-control--subtle ${repeat !== "off" ? "is-on" : ""}`} aria-label="Cycle repeat mode" title={`Repeat ${repeat}`} onClick={() => setRepeat((mode) => mode === "off" ? "all" : mode === "all" ? "one" : "off")}>{repeat === "one" ? <Repeat1 size={16}/> : <Repeat size={16}/>}</button>
          </div>
          <div className="player__timeline">
            <span>{formatTime(currentTime)}</span>
            <input aria-label="Track position" type="range" min="0" max={Math.max(duration || currentTrack?.duration || 0, 1)} step="1" value={Math.min(currentTime, Math.max(duration || currentTrack?.duration || 1, 1))} style={{ background: `linear-gradient(to right, #c5fa78 ${duration ? (currentTime / duration) * 100 : 0}%, rgba(255,255,255,.12) 0)` }} onChange={(event) => {
            const time = Number(event.target.value);
            setCurrentTime(time);
            if (audioRef.current)
                audioRef.current.currentTime = time;
        }}/>
            <span>{formatTime(duration || currentTrack?.duration || 0)}</span>
          </div>
        </div>
        <div className="player__utilities">
          <button className="player-control player-queue-control" aria-label="Show queue" onClick={() => setRightOpen((open) => !open)}><ListMusic size={17}/></button>
          <button className="player-control" aria-label={volume === 0 ? "Turn volume on" : "Mute"} onClick={() => setVolume((value) => value === 0 ? 0.78 : 0)}>{volume === 0 ? <VolumeX size={17}/> : <Volume2 size={17}/>}</button>
          <input aria-label="Volume" className="volume-range" type="range" min="0" max="1" step="0.01" value={volume} style={{ background: `linear-gradient(to right, #c5fa78 ${volume * 100}%, rgba(255,255,255,.12) 0)` }} onChange={(event) => setVolume(Number(event.target.value))}/>
          <button className="player-control player-expand" aria-label="Toggle now playing panel" onClick={() => setRightOpen((open) => !open)}><ChevronDown size={16}/></button>
        </div>
      </section>

      <audio ref={audioRef} preload="metadata" onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime || 0)} onLoadedMetadata={(event) => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : currentTrack?.duration ?? 0)} onDurationChange={(event) => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : currentTrack?.duration ?? 0)} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onEnded={playNext} onError={() => setIsPlaying(false)}/>

      {modal && (<div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget)
            setModal(null); }}>
          {modal === "upload" ? (<section className="modal-card upload-modal" role="dialog" aria-modal="true" aria-labelledby="upload-title">
              <div className="modal-topline"><span className="modal-icon"><Upload size={18}/></span><button className="icon-button modal-close" aria-label="Close upload dialog" onClick={() => setModal(null)}><X size={18}/></button></div>
              <span className="eyebrow">YOUR MUSIC BELONGS HERE</span><h2 id="upload-title">Add a little<br /><em>something of your own.</em></h2><p className="modal-intro">A song, a demo, a secret favorite. Added straight to your personal listening room.</p>
              <form onSubmit={(event) => void submitUpload(event)}>
                <label className={`dropzone ${uploadFile ? "dropzone--ready" : ""}`} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); chooseUploadFile(event.dataTransfer.files?.[0] ?? null); }}>
                  <input type="file" accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac,.webm" onChange={(event) => chooseUploadFile(event.target.files?.[0] ?? null)}/>
                  <span className="dropzone__icon">{uploadFile ? <Check size={20}/> : <Upload size={19}/>}</span>
                  <span className="dropzone__copy"><strong>{uploadFile ? uploadFile.name : "Drop an audio file here"}</strong><small>{uploadFile ? `${uploadDuration ? `${formatTime(uploadDuration)} · ` : ""}${(uploadFile.size / (1024 * 1024)).toFixed(1)} MB · stored privately in your library` : "or browse files · MP3, WAV, M4A, FLAC · up to 32 MB"}</small></span>
                  <span className="dropzone__browse">{uploadFile ? "Change" : "Browse"}</span>
                </label>
                <div className="upload-form-grid">
                  <label className="form-field"><span>Track name <b>*</b></span><input required maxLength={120} value={uploadTitle} onChange={(event) => setUploadTitle(event.target.value)} placeholder="What are we listening to?"/></label>
                  <label className="form-field"><span>Artist <b>*</b></span><input required maxLength={120} value={uploadArtist} onChange={(event) => setUploadArtist(event.target.value)} placeholder="You, a friend, someone lovely"/></label>
                  <label className="form-field"><span>Album <i>optional</i></span><input maxLength={120} value={uploadAlbum} onChange={(event) => setUploadAlbum(event.target.value)} placeholder="A single is just fine"/></label>
                  <label className="form-field"><span>Feeling / style</span><select value={uploadGenre} onChange={(event) => setUploadGenre(event.target.value)}><option>Indie pop</option><option>Electronic</option><option>Dream pop</option><option>Soul</option><option>Ambient</option><option>Jazz</option><option>Rock</option><option>Unsorted</option></select></label>
                </div>
                <div className="artwork-picker"><span>Pick a cover mood</span><div>{artworkOptions.map((option) => <button key={option} type="button" className={`artwork-swatch ${uploadArtwork === option ? "is-selected" : ""}`} style={{ background: artworkColors[option] }} aria-label={`${option} artwork`} onClick={() => setUploadArtwork(option)}>{uploadArtwork === option && <Check size={13}/>}</button>)}</div></div>
                <div className="modal-actions"><button type="button" className="modal-cancel" onClick={() => setModal(null)}>Maybe later</button><button type="submit" className="modal-submit" disabled={isUploading || !uploadFile}>{isUploading ? <><LoaderCircle size={16} className="spin"/> Saving to your room...</> : <><Plus size={16}/> Add to my library</>}</button></div>
                <p className="privacy-note"><span className="privacy-dot"/> Your file stays in your own library. No external storage. No fuss.</p>
              </form>
            </section>) : (<section className="modal-card playlist-modal" role="dialog" aria-modal="true" aria-labelledby="playlist-title">
              <div className="modal-topline"><span className="modal-icon modal-icon--purple"><ListMusic size={18}/></span><button className="icon-button modal-close" aria-label="Close playlist dialog" onClick={() => setModal(null)}><X size={18}/></button></div>
              <span className="eyebrow">A HOME FOR A FEELING</span><h2 id="playlist-title">Make a little<br /><em>collection.</em></h2><p className="modal-intro">For the long way home. The soft Sunday morning. Whatever you want to remember.</p>
              <form onSubmit={(event) => void submitPlaylist(event)}>
                <label className="form-field"><span>Give it a name <b>*</b></span><input autoFocus required maxLength={64} value={playlistName} onChange={(event) => setPlaylistName(event.target.value)} placeholder="e.g. for the ride home"/></label>
                <label className="form-field"><span>A few words <i>optional</i></span><textarea maxLength={220} rows={3} value={playlistDescription} onChange={(event) => setPlaylistDescription(event.target.value)} placeholder="What does this collection feel like?"/></label>
                <div className="modal-actions"><button type="button" className="modal-cancel" onClick={() => setModal(null)}>Never mind</button><button type="submit" className="modal-submit" disabled={isSavingPlaylist || !playlistName.trim()}>{isSavingPlaylist ? <><LoaderCircle size={16} className="spin"/> Making your collection...</> : <><Sparkles size={16}/> Make it yours</>}</button></div>
              </form>
            </section>)}
        </div>)}

      {toast && <div className="toast-message" role="status"><span className="toast-message__icon"><Check size={14}/></span>{toast}</div>}
    </main>);
}
