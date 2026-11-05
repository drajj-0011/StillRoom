import { exec } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { promisify } from "node:util";

const execAsync = promisify(exec);

const MONGO_VERSION = "8.3.13";
const DOWNLOAD_URL = `https://fastdl.mongodb.org/linux/mongodb-linux-x86_64-debian12-${MONGO_VERSION}.tgz`;

const root = process.cwd();
const installDir = path.join(root, ".mongodb");
const dataDir = path.join(root, ".mongo-data");
const mongodBinary = path.join(installDir, "bin", "mongod");

function portOpen(host, port) {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port });
    const done = (value) => {
      socket.destroy();
      resolve(value);
    };
    socket.once("connect", () => done(true));
    socket.once("error", () => done(false));
    socket.setTimeout(1500, () => done(false));
  });
}

async function installMongo() {
  if (fs.existsSync(mongodBinary)) return true;
  try {
    fs.mkdirSync(installDir, { recursive: true });
    const archive = path.join(installDir, "mongodb.tgz");
    await execAsync(`curl -sSL --max-time 400 -o "${archive}" "${DOWNLOAD_URL}"`, { timeout: 420000 });
    await execAsync(`tar -xzf "${archive}" -C "${installDir}" --strip-components=1`, { timeout: 120000 });
    fs.rmSync(archive, { force: true });
    return fs.existsSync(mongodBinary);
  } catch (error) {
    console.error("Could not download MongoDB:", error);
    return false;
  }
}

async function startMongod(port) {
  try {
    fs.mkdirSync(dataDir, { recursive: true });
    await execAsync(
      `"${mongodBinary}" --dbpath "${dataDir}" --bind_ip 127.0.0.1 --port ${port} --fork --logpath "${path.join(root, ".mongo-data", "mongod.log")}"`,
      { timeout: 60000 },
    );
    return true;
  } catch (error) {
    console.error("Could not start MongoDB:", error);
    return false;
  }
}

export async function ensureMongoRunning() {
  const url = process.env.MONGODB_URL ?? "mongodb://127.0.0.1:27017/stillroom";
  const match = /\/\/(?:[^@/]*@)?([^:/,]+):(\d+)/.exec(url);
  const host = match?.[1] ?? "127.0.0.1";
  const port = Number(match?.[2] ?? 27017);

  // Only manage a local MongoDB. Remote URLs (e.g. Atlas) are left alone.
  if (host !== "127.0.0.1" && host !== "localhost") return;
  if (await portOpen(host, port)) return;

  // Auto-install only works on the Linux sandbox. On Windows/macOS, install and
  // start MongoDB yourself (or use MongoDB Atlas) and set MONGODB_URL in .env.
  if (process.platform !== "linux") {
    console.warn(
      `MongoDB is not reachable at ${host}:${port}. Start MongoDB locally or set MONGODB_URL in .env.`,
    );
    return;
  }

  if (!(await installMongo())) return;
  if (!(await startMongod(port))) return;

  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (await portOpen(host, port)) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  console.error("MongoDB did not become ready in time.");
}
