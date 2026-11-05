import { MongoClient } from "mongodb";
import { ensureMongoRunning } from "@/lib/mongo-process";

const uri = process.env.MONGODB_URL ?? "mongodb://127.0.0.1:27017/stillroom";

const globalForMongo = globalThis;

async function connectClient() {
  const client = new MongoClient(uri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
  });

  try {
    await client.connect();
    return client;
  } catch (error) {
    // A cold sandbox may have stopped the local MongoDB server. Bring it back up
    // and retry once so the listening room never needs a manual restart.
    await client.close().catch(() => {});
    await ensureMongoRunning();
    const retryClient = new MongoClient(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 8000,
    });
    await retryClient.connect();
    return retryClient;
  }
}

export async function getMongoClient() {
  if (!globalForMongo.__stillroomMongoClient) {
    globalForMongo.__stillroomMongoClient = await connectClient();
  }
  return globalForMongo.__stillroomMongoClient;
}

export async function getDb() {
  if (!globalForMongo.__stillroomMongoDb) {
    const client = await getMongoClient();
    globalForMongo.__stillroomMongoDb = client.db();
  }
  return globalForMongo.__stillroomMongoDb;
}

export async function tracksCollection() {
  return (await getDb()).collection("tracks");
}

export async function favoritesCollection() {
  return (await getDb()).collection("favorites");
}

export async function playlistsCollection() {
  return (await getDb()).collection("playlists");
}
