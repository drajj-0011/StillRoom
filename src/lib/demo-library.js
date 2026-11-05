import { tracksCollection } from "@/db";
const SAMPLE_RATE = 22050;
const SAMPLE_SECONDS = 42;
const demoTracks = [
    {
        id: "a9010000-0000-4000-8000-000000000001",
        title: "A Slow Kind of Bright",
        artist: "Luna Sol",
        album: "Soft Hours",
        genre: "Indie pop",
        artwork: "dawn",
        plays: 482,
        root: 196,
        chords: [0, 5, 7, 3],
    },
    {
        id: "a9010000-0000-4000-8000-000000000002",
        title: "Afterimage",
        artist: "Serein",
        album: "The In-Between",
        genre: "Electronic",
        artwork: "afterglow",
        plays: 1306,
        root: 174,
        chords: [0, 3, 8, 5],
    },
    {
        id: "a9010000-0000-4000-8000-000000000003",
        title: "Apricity",
        artist: "Milo June",
        album: "Little Sun",
        genre: "Soul",
        artwork: "amber",
        plays: 928,
        root: 220,
        chords: [0, 7, 3, 5],
    },
    {
        id: "a9010000-0000-4000-8000-000000000004",
        title: "Blue Orchard",
        artist: "Lila Noire",
        album: "Swimming Upstream",
        genre: "Dream pop",
        artwork: "ocean",
        plays: 721,
        root: 164,
        chords: [0, 5, 3, 7],
    },
    {
        id: "a9010000-0000-4000-8000-000000000005",
        title: "Nobody's Sunday",
        artist: "The Slowtowns",
        album: "Quiet People",
        genre: "Indie pop",
        artwork: "rose",
        plays: 1117,
        root: 185,
        chords: [0, 3, 7, 10],
    },
    {
        id: "a9010000-0000-4000-8000-000000000006",
        title: "Velvet Static",
        artist: "Møra",
        album: "Room Tone",
        genre: "Ambient",
        artwork: "night",
        plays: 604,
        root: 147,
        chords: [0, 7, 5, 3],
    },
];
function makePreview(seed, root, chordPattern) {
    const frameCount = SAMPLE_RATE * SAMPLE_SECONDS;
    const bytes = Buffer.allocUnsafe(44 + frameCount * 2);
    bytes.write("RIFF", 0);
    bytes.writeUInt32LE(36 + frameCount * 2, 4);
    bytes.write("WAVE", 8);
    bytes.write("fmt ", 12);
    bytes.writeUInt32LE(16, 16);
    bytes.writeUInt16LE(1, 20);
    bytes.writeUInt16LE(1, 22);
    bytes.writeUInt32LE(SAMPLE_RATE, 24);
    bytes.writeUInt32LE(SAMPLE_RATE * 2, 28);
    bytes.writeUInt16LE(2, 32);
    bytes.writeUInt16LE(16, 34);
    bytes.write("data", 36);
    bytes.writeUInt32LE(frameCount * 2, 40);
    const bpm = 84 + (seed % 4) * 8;
    const beat = 60 / bpm;
    const chordLength = beat * 4;
    const scale = [0, 2, 3, 7, 9, 12, 14, 17];
    let noiseState = 12345 + seed * 9271;
    for (let frame = 0; frame < frameCount; frame += 1) {
        const time = frame / SAMPLE_RATE;
        const chordIndex = Math.floor(time / chordLength) % chordPattern.length;
        const chordOffset = chordPattern[chordIndex];
        const chordRoot = root * Math.pow(2, chordOffset / 12);
        const chordProgress = (time % chordLength) / chordLength;
        const fadeIn = Math.min(1, time / 0.85);
        const fadeOut = Math.min(1, (SAMPLE_SECONDS - time) / 1.25);
        const pad = Math.sin(2 * Math.PI * chordRoot * time) * 0.16 +
            Math.sin(2 * Math.PI * chordRoot * 1.5 * time + 0.5) * 0.08 +
            Math.sin(2 * Math.PI * chordRoot * 2 * time + 1.1) * 0.045 +
            Math.sin(2 * Math.PI * chordRoot * 0.5 * time) * 0.1;
        const melodyStep = Math.floor(time / (beat / 2));
        const melodyNote = scale[(melodyStep * 3 + seed * 2 + Math.floor(melodyStep / 7)) % scale.length];
        const melodyFrequency = root * Math.pow(2, (12 + chordOffset + melodyNote) / 12);
        const melodyEnvelope = 0.5 + 0.5 * Math.cos(Math.PI * ((time % (beat / 2)) / (beat / 2)));
        const melody = (Math.sin(2 * Math.PI * melodyFrequency * time) * 0.12 +
            Math.sin(2 * Math.PI * melodyFrequency * 2 * time) * 0.022) *
            melodyEnvelope;
        const bassPulse = time % beat;
        const bassEnvelope = Math.exp(-bassPulse * 3.3);
        const bass = Math.sin(2 * Math.PI * (root / 2) * time) * bassEnvelope * 0.2;
        const bellFrequency = root * Math.pow(2, (24 + chordOffset + scale[(seed + Math.floor(time / 2.4)) % scale.length]) / 12);
        const bellEnvelope = Math.exp(-((time % (beat * 2)) * 2.4));
        const bell = Math.sin(2 * Math.PI * bellFrequency * time) * bellEnvelope * 0.045;
        const swell = 0.78 + 0.22 * Math.sin(2 * Math.PI * chordProgress);
        noiseState = (noiseState * 1103515245 + 12345) & 0x7fffffff;
        const dust = ((noiseState / 0x7fffffff) * 2 - 1) * 0.008;
        const sample = Math.max(-1, Math.min(1, (pad * swell + melody + bass + bell + dust) * fadeIn * fadeOut));
        bytes.writeInt16LE(Math.round(sample * 23000), 44 + frame * 2);
    }
    return bytes;
}
export async function seedDemoLibrary() {
    const tracks = await tracksCollection();
    const count = await tracks.countDocuments();
    if (count > 0)
        return;
    const now = new Date();
    await tracks.insertMany(demoTracks.map((track, index) => ({
        _id: track.id,
        title: track.title,
        artist: track.artist,
        album: track.album,
        genre: track.genre,
        artwork: track.artwork,
        duration: SAMPLE_SECONDS,
        plays: track.plays,
        isDemo: true,
        fileName: `${track.title.toLowerCase().replaceAll(" ", "-")}.wav`,
        mimeType: "audio/wav",
        fileSize: SAMPLE_RATE * SAMPLE_SECONDS * 2 + 44,
        audio: makePreview(index + 1, track.root, track.chords),
        createdAt: new Date(now.getTime() - (demoTracks.length - index) * 60000),
    })));
}
