import { playlistsCollection, tracksCollection } from "@/db";
export const dynamic = "force-dynamic";
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function POST(request, context) {
    const { id } = await context.params;
    try {
        const body = (await request.json());
        const trackId = typeof body.trackId === "string" ? body.trackId : "";
        if (!uuidPattern.test(id) || !uuidPattern.test(trackId)) {
            return Response.json({ error: "Choose a valid playlist and track." }, { status: 400 });
        }
        const tracks = await tracksCollection();
        const trackExists = await tracks.findOne({ _id: trackId }, { projection: { _id: 1 } });
        if (!trackExists)
            return Response.json({ error: "Track not found." }, { status: 404 });
        const playlists = await playlistsCollection();
        const result = await playlists.updateOne({ _id: id }, { $addToSet: { trackIds: trackId } });
        if (result.matchedCount === 0) {
            return Response.json({ error: "Playlist not found." }, { status: 404 });
        }
        return Response.json({ playlistId: id, trackId, added: true });
    }
    catch {
        return Response.json({ error: "That track couldn't be added to the playlist." }, { status: 500 });
    }
}
export async function DELETE(request, context) {
    const { id } = await context.params;
    try {
        const body = (await request.json());
        const trackId = typeof body.trackId === "string" ? body.trackId : "";
        if (!uuidPattern.test(id) || !uuidPattern.test(trackId)) {
            return Response.json({ error: "Choose a valid playlist and track." }, { status: 400 });
        }
        const playlists = await playlistsCollection();
        const result = await playlists.updateOne({ _id: id }, { $pull: { trackIds: trackId } });
        if (result.matchedCount === 0) {
            return Response.json({ error: "Playlist not found." }, { status: 404 });
        }
        return Response.json({ playlistId: id, trackId, removed: true });
    }
    catch {
        return Response.json({ error: "That track couldn't be removed." }, { status: 500 });
    }
}
