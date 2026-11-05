import { tracksCollection } from "@/db";
export const dynamic = "force-dynamic";
export async function POST(_request, context) {
    const { id } = await context.params;
    try {
        const tracks = await tracksCollection();
        const updated = await tracks.findOneAndUpdate({ _id: id }, { $inc: { plays: 1 } }, { returnDocument: "after", projection: { _id: 1, plays: 1 } });
        if (!updated)
            return Response.json({ error: "Track not found." }, { status: 404 });
        return Response.json({ id: updated._id, plays: updated.plays });
    }
    catch {
        return Response.json({ error: "Play count could not be updated." }, { status: 400 });
    }
}
