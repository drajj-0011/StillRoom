import { favoritesCollection, tracksCollection } from "@/db";
export const dynamic = "force-dynamic";
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function PUT(_request, context) {
    const { id } = await context.params;
    if (!uuidPattern.test(id))
        return Response.json({ error: "Track not found." }, { status: 404 });
    try {
        const tracks = await tracksCollection();
        const exists = await tracks.findOne({ _id: id }, { projection: { _id: 1 } });
        if (!exists)
            return Response.json({ error: "Track not found." }, { status: 404 });
        const favorites = await favoritesCollection();
        await favorites.updateOne({ _id: id }, { $setOnInsert: { _id: id, createdAt: new Date() } }, { upsert: true });
        return Response.json({ trackId: id, favorite: true });
    }
    catch {
        return Response.json({ error: "That track couldn't be liked." }, { status: 500 });
    }
}
export async function DELETE(_request, context) {
    const { id } = await context.params;
    if (!uuidPattern.test(id))
        return Response.json({ error: "Track not found." }, { status: 404 });
    const favorites = await favoritesCollection();
    await favorites.deleteOne({ _id: id });
    return Response.json({ trackId: id, favorite: false });
}
