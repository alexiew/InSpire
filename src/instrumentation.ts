// ABOUTME: Next.js startup hook, run once when the server process boots.
// ABOUTME: Recovers content items stranded mid-pipeline by a previous shutdown.

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { requeueStuckProcessing } = await import("@/lib/process-queue");
  const count = requeueStuckProcessing();
  if (count > 0) {
    console.log(`Requeued ${count} content item(s) left in the processing state`);
  }
}
