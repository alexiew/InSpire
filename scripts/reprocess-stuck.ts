// ABOUTME: One-off recovery script that reprocesses stuck content strictly one at a time.
// ABOUTME: Avoids the OOM that happens when many items are processed concurrently.

import { getDb } from "../src/lib/db";
import { processContent } from "../src/lib/process-content";

async function main() {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, status, source_type, title, url
       FROM content
       WHERE status IN ('processing', 'error')
       ORDER BY status DESC, created_at ASC`
    )
    .all() as { id: string; status: string; source_type: string; title: string; url: string }[];

  console.log(`Found ${rows.length} stuck items to reprocess (one at a time).\n`);

  let ok = 0;
  let failed = 0;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const label = r.title?.trim() || r.url;
    process.stdout.write(
      `[${i + 1}/${rows.length}] (${r.source_type}, was ${r.status}) ${label.slice(0, 70)} ... `
    );

    try {
      await processContent(r.id);
      const after = db.prepare("SELECT status, error FROM content WHERE id = ?").get(r.id) as
        | { status: string; error: string | null }
        | undefined;
      if (after?.status === "ready") {
        ok++;
        console.log("ready");
      } else if (after?.status === "discarded") {
        console.log("discarded (filter)");
      } else {
        failed++;
        console.log(`error: ${after?.error?.slice(0, 100) ?? "unknown"}`);
      }
    } catch (err) {
      failed++;
      console.log(`threw: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log(`\nDone. ${ok} ready, ${failed} still failing, ${rows.length - ok - failed} discarded.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
