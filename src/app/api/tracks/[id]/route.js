import { tracksCollection } from "@/db";
export const dynamic = "force-dynamic";
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function DELETE(_request, context) {
    const { id } = await context.params;
    if (!uuidPattern.test(id))
        return Response.json({ error: "Track not found." }, { status: 404 });
    const tracks = await tracksCollection();
    const track = await tracks.findOne({ _id: id }, { projection: { isDemo: 1 } });
    if (!track)
        return Response.json({ error: "Track not found." }, { status: 404 });
    if (track.isDemo) {
        return Response.json({ error: "Original sample tracks are part of the listening room." }, { status: 403 });
    }
    await tracks.deleteOne({ _id: id });
    return Response.json({ ok: true });
}
