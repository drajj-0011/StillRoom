import { favoritesCollection } from "@/db";
export const dynamic = "force-dynamic";
export async function GET() {
    const favorites = await favoritesCollection();
    const rows = await favorites.find({}).toArray();
    return Response.json(rows.map((row) => row._id));
}
