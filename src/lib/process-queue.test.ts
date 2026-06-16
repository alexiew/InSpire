// ABOUTME: Tests the bounded-concurrency processing queue.
// ABOUTME: Verifies that no more than the configured number of tasks run at once.

import { describe, it, expect } from "vitest";
import { enqueue, MAX_CONCURRENT } from "./process-queue";

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe("processing queue", () => {
  it("runs at most MAX_CONCURRENT tasks at once", async () => {
    const count = MAX_CONCURRENT + 3;
    const gates = Array.from({ length: count }, () => deferred());
    let active = 0;
    let peak = 0;
    const done: Promise<void>[] = [];

    for (let i = 0; i < count; i++) {
      done.push(
        new Promise<void>((resolveDone) => {
          enqueue(async () => {
            active++;
            peak = Math.max(peak, active);
            await gates[i].promise;
            active--;
            resolveDone();
          });
        })
      );
    }

    // Synchronously, the pump should have started exactly MAX_CONCURRENT tasks.
    expect(active).toBe(MAX_CONCURRENT);

    gates.forEach((g) => g.resolve());
    await Promise.all(done);

    expect(peak).toBe(MAX_CONCURRENT);
  });
});
