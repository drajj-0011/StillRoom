export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  try {
    const { ensureMongoRunning } = await import("@/lib/mongo-process");
    // Warm MongoDB in the background: the web server must never wait for it.
    ensureMongoRunning().catch(() => {});
  } catch (error) {
    console.error("MongoDB warm-up failed:", error);
  }
}
