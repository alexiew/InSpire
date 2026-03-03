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

const WORDS_PER_MINUTE = 200;

export function transcriptStats(text: string): { wordCount: number; duration: string } {
  const trimmed = text.trim();
  const wordCount = trimmed ? trimmed.split(/\s+/).length : 0;
  const totalMinutes = Math.round(wordCount / WORDS_PER_MINUTE);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const duration = hours > 0 ? `${hours}h ${minutes}min` : `${minutes} min`;
  return { wordCount, duration };
}
