import { favoritesCollection, playlistsCollection, tracksCollection } from "@/db";
import { seedDemoLibrary } from "@/lib/demo-library";
export const dynamic = "force-dynamic";
export async function GET() {
    try {
        await seedDemoLibrary();
        const tracks = await tracksCollection();
        const favorites = await favoritesCollection();
        const playlists = await playlistsCollection();
        const [trackRows, favoriteRows, playlistRows] = await Promise.all([
            tracks.find({}, { projection: { audio: 0 } }).sort({ createdAt: -1 }).toArray(),
            favorites.find({}).toArray(),
            playlists.find({}).sort({ createdAt: -1 }).toArray(),
        ]);
        return Response.json({
            tracks: trackRows.map(({ _id, ...rest }) => ({ id: _id, ...rest })),
            favorites: favoriteRows.map((row) => row._id),
            playlists: playlistRows.map(({ _id, ...rest }) => ({ id: _id, ...rest })),
        });
    }
    catch (error) {
        console.error("Unable to load the listening library:", error);
        return Response.json({ error: "Your listening room couldn't load just now." }, { status: 500 });
    }
}
