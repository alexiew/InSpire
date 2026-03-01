// ABOUTME: Converts raw YouTube caption-style transcripts into readable paragraphs.
// ABOUTME: Joins short caption lines, preserves speaker labels as paragraph breaks.

const SPEAKER_LABEL = /^[A-Z][A-Z ]+:/;
const STAGE_DIRECTION = /^\[.*\]$/;

export function formatTranscript(raw: string): string {
  const lines = raw.split("\n").map((l) => l.trim());

  const paragraphs: string[] = [];
  let current: string[] = [];

  function flush() {
    if (current.length > 0) {
      paragraphs.push(current.join(" ").replace(/ {2,}/g, " ").trim());
      current = [];
    }
  }

  for (const line of lines) {
    if (!line) continue;
    if (line === "Transcript:") continue;
    if (STAGE_DIRECTION.test(line)) continue;

    if (SPEAKER_LABEL.test(line)) {
      flush();
    }
    current.push(line);
  }
  flush();

  return paragraphs.join("\n\n");
}
