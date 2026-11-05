import { playlistsCollection } from "@/db";
export const dynamic = "force-dynamic";
const artworkOptions = new Set(["dawn", "afterglow", "amber", "ocean", "rose", "night", "mint", "lilac"]);
export async function GET() {
    const playlists = await playlistsCollection();
    const rows = await playlists.find({}).sort({ createdAt: -1 }).toArray();
    return Response.json(rows.map(({ _id, ...rest }) => ({ id: _id, ...rest })));
}
export async function POST(request) {
    try {
        const body = (await request.json());
        const name = typeof body.name === "string" ? body.name.trim().slice(0, 64) : "";
        const description = typeof body.description === "string"
            ? body.description.trim().slice(0, 220)
            : "A little collection of good sounds.";
        const artwork = typeof body.artwork === "string" && artworkOptions.has(body.artwork)
            ? body.artwork
            : "afterglow";
        if (!name)
            return Response.json({ error: "Give your playlist a name first." }, { status: 400 });
        const playlists = await playlistsCollection();
        const doc = {
            _id: crypto.randomUUID(),
            name,
            description: description || "A little collection of good sounds.",
            artwork,
            trackIds: [],
            createdAt: new Date(),
        };
        await playlists.insertOne(doc);
        const { _id, ...rest } = doc;
        return Response.json({ id: _id, ...rest }, { status: 201 });
    }
    catch {
        return Response.json({ error: "Your playlist couldn't be created." }, { status: 400 });
    }
}
