import { tracksCollection } from "@/db";
export const dynamic = "force-dynamic";
function toBuffer(value) {
    if (Buffer.isBuffer(value))
        return value;
    const binary = value;
    if (typeof binary.value === "function")
        return binary.value();
    if (Buffer.isBuffer(binary.buffer))
        return binary.buffer;
    return Buffer.from(binary.buffer);
}
export async function GET(request, context) {
    const { id } = await context.params;
    try {
        const tracks = await tracksCollection();
        const track = await tracks.findOne({ _id: id }, { projection: { audio: 1, mimeType: 1, fileName: 1 } });
        if (!track)
            return new Response("Audio not found", { status: 404 });
        const bytes = toBuffer(track.audio);
        const range = request.headers.get("range");
        const baseHeaders = {
            "Content-Type": track.mimeType,
            "Accept-Ranges": "bytes",
            "Cache-Control": "private, max-age=0, must-revalidate",
            "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(track.fileName)}`,
        };
        if (!range) {
            return new Response(new Uint8Array(bytes), {
                headers: { ...baseHeaders, "Content-Length": String(bytes.byteLength) },
            });
        }
        const match = /^bytes=(\d*)-(\d*)$/.exec(range);
        if (!match || (!match[1] && !match[2])) {
            return new Response(null, {
                status: 416,
                headers: { "Content-Range": `bytes */${bytes.byteLength}` },
            });
        }
        const start = match[1] ? Number(match[1]) : Math.max(0, bytes.byteLength - Number(match[2]));
        const end = match[2] && match[1]
            ? Math.min(Number(match[2]), bytes.byteLength - 1)
            : match[2]
                ? bytes.byteLength - 1
                : bytes.byteLength - 1;
        if (start >= bytes.byteLength || start > end) {
            return new Response(null, {
                status: 416,
                headers: { "Content-Range": `bytes */${bytes.byteLength}` },
            });
        }
        const chunk = new Uint8Array(bytes.subarray(start, end + 1));
        return new Response(chunk, {
            status: 206,
            headers: {
                ...baseHeaders,
                "Content-Length": String(chunk.byteLength),
                "Content-Range": `bytes ${start}-${end}/${bytes.byteLength}`,
            },
        });
    }
    catch (error) {
        console.error("Unable to stream track audio:", error);
        return new Response("Audio could not be streamed", { status: 500 });
    }
}
