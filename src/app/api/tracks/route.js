import { tracksCollection } from "@/db";
export const dynamic = "force-dynamic";
const allowedExtensions = new Set(["mp3", "wav", "ogg", "oga", "m4a", "aac", "flac", "webm"]);
const artworkOptions = new Set(["dawn", "afterglow", "amber", "ocean", "rose", "night", "mint", "lilac"]);
const maxAudioBytes = 32 * 1024 * 1024;
export async function GET() {
    const tracks = await tracksCollection();
    const rows = await tracks
        .find({}, { projection: { audio: 0 } })
        .sort({ createdAt: -1 })
        .toArray();
    return Response.json(rows.map(({ _id, ...rest }) => ({ id: _id, ...rest })));
}
export async function POST(request) {
    try {
        const form = await request.formData();
        const audio = form.get("audio");
        if (!(audio instanceof File) || audio.size === 0) {
            return Response.json({ error: "Choose an audio file before adding it." }, { status: 400 });
        }
        if (audio.size > maxAudioBytes) {
            return Response.json({ error: "Files can be up to 32 MB." }, { status: 413 });
        }
        const fileName = audio.name || "my-track.mp3";
        const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
        if (!audio.type.startsWith("audio/") && !allowedExtensions.has(extension)) {
            return Response.json({ error: "Choose an MP3, WAV, OGG, M4A, AAC, FLAC, or WebM audio file." }, { status: 415 });
        }
        const title = String(form.get("title") ?? "").trim().slice(0, 120);
        const artist = String(form.get("artist") ?? "").trim().slice(0, 120);
        const album = String(form.get("album") ?? "").trim().slice(0, 120) || "Single";
        const genre = String(form.get("genre") ?? "").trim().slice(0, 64) || "Unsorted";
        const requestedArtwork = String(form.get("artwork") ?? "");
        const artwork = artworkOptions.has(requestedArtwork) ? requestedArtwork : "lilac";
        const requestedDuration = Number(form.get("duration"));
        const duration = Number.isFinite(requestedDuration)
            ? Math.max(0, Math.min(36000, Math.round(requestedDuration)))
            : 0;
        if (!title || !artist) {
            return Response.json({ error: "Add a track title and artist name." }, { status: 400 });
        }
        const tracks = await tracksCollection();
        const doc = {
            _id: crypto.randomUUID(),
            title,
            artist,
            album,
            genre,
            artwork,
            duration,
            plays: 0,
            isDemo: false,
            fileName,
            mimeType: audio.type || "application/octet-stream",
            fileSize: audio.size,
            audio: Buffer.from(await audio.arrayBuffer()),
            createdAt: new Date(),
        };
        await tracks.insertOne(doc);
        const { _id, audio: _audio, ...track } = doc;
        return Response.json({ id: _id, ...track }, { status: 201 });
    }
    catch (error) {
        console.error("Unable to add audio to the library:", error);
        return Response.json({ error: "Your track couldn't be saved. Please try again." }, { status: 500 });
    }
}
