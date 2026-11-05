import { playlistsCollection } from "@/db";
export const dynamic = "force-dynamic";
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function PATCH(request, context) {
    const { id } = await context.params;
    if (!uuidPattern.test(id))
        return Response.json({ error: "Playlist not found." }, { status: 404 });
    try {
        const body = (await request.json());
        const changes = {};
        if (typeof body.name === "string") {
            const name = body.name.trim().slice(0, 64);
            if (!name)
                return Response.json({ error: "Give your playlist a name." }, { status: 400 });
            changes.name = name;
        }
        if (typeof body.description === "string")
            changes.description = body.description.trim().slice(0, 220);
        if (typeof body.artwork === "string")
            changes.artwork = body.artwork;
        if (Object.keys(changes).length === 0) {
            return Response.json({ error: "Nothing to update." }, { status: 400 });
        }
        const playlists = await playlistsCollection();
        const updated = await playlists.findOneAndUpdate({ _id: id }, { $set: changes }, { returnDocument: "after" });
        if (!updated)
            return Response.json({ error: "Playlist not found." }, { status: 404 });
        const { _id, ...rest } = updated;
        return Response.json({ id: _id, ...rest });
    }
    catch {
        return Response.json({ error: "Playlist couldn't be updated." }, { status: 400 });
    }
}
export async function DELETE(_request, context) {
    const { id } = await context.params;
    if (!uuidPattern.test(id))
        return Response.json({ error: "Playlist not found." }, { status: 404 });
    const playlists = await playlistsCollection();
    const result = await playlists.deleteOne({ _id: id });
    if (result.deletedCount === 0)
        return Response.json({ error: "Playlist not found." }, { status: 404 });
    return Response.json({ ok: true });
}
