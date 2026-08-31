// ABOUTME: Bounded-concurrency queue for content processing.
// ABOUTME: Caps simultaneous summarize + claude subprocesses so a large refresh can't exhaust memory.

import { processContent } from "./process-content";
import { listProcessing } from "./content";

type Task = () => Promise<void>;

export const MAX_CONCURRENT = 2;

const queue: Task[] = [];
let active = 0;

function pump(): void {
  while (active < MAX_CONCURRENT && queue.length > 0) {
    const task = queue.shift()!;
    active++;
    task().finally(() => {
      active--;
      pump();
    });
  }
}

export function enqueue(task: Task): void {
  queue.push(task);
  pump();
}

export function enqueueProcessing(id: string, options?: { minTranscriptWords?: number }): void {
  enqueue(() => processContent(id, options).catch(() => {}));
}

// The queue lives in memory, so anything in flight when the server stops is
// stranded in the processing state. Pick those items back up on the next boot.
export function requeueStuckProcessing(): number {
  const stuck = listProcessing();
  for (const item of stuck) {
    enqueueProcessing(item.id);
  }
  return stuck.length;
}
