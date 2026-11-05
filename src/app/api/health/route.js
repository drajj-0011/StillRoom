import { getDb } from "@/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    return Response.json({ ok: true, database: "mongodb" });
  } catch {
    return Response.json({ ok: false, database: "mongodb" }, { status: 500 });
  }
}
