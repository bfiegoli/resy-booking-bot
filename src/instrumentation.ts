export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { loadPendingSnipes } = await import("./lib/scheduler");
    console.log("[BOOT] Starting snipe scheduler...");
    await loadPendingSnipes();
  }
}
