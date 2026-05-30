/**
 * Shared Server-Sent-Events framing for the studio's POST streams.
 *
 * The browser's `EventSource` API is GET-only and can't send custom headers or
 * a request body, so both the completions stream and the Azure bridge stream
 * over `fetch` + `ReadableStream` and frame the bytes themselves. This module
 * is the single place that does that framing, so the two callers don't carry
 * their own copy of the buffer/`\n\n`-split logic.
 */

/** A single decoded SSE frame. `data` is the joined `data:` payload (may be ''). */
export interface SseFrame {
  event: string;
  data: string;
}

/**
 * Split a growing SSE buffer into complete frames, returning the unparsed tail.
 *
 * TCP doesn't promise frame-aligned reads, so the caller accumulates bytes and
 * feeds the running buffer in; everything up to the last `\n\n` is yielded as
 * complete frames and the remainder is returned for the next read.
 */
export function* splitSseFrames(buffer: string): Generator<SseFrame, string> {
  let rest = buffer;
  let idx: number;
  while ((idx = rest.indexOf('\n\n')) !== -1) {
    const raw = rest.slice(0, idx);
    rest = rest.slice(idx + 2);
    let event = 'message';
    const dataLines: string[] = [];
    for (const line of raw.split('\n')) {
      if (line.startsWith('event:')) {
        event = line.slice('event:'.length).trim();
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice('data:'.length).trim());
      }
    }
    yield { event, data: dataLines.join('\n') };
  }
  return rest;
}

/**
 * Drive a byte stream to completion, invoking `onFrame` for each complete SSE
 * frame. Throwing from `onFrame` (e.g. on an error frame) aborts the loop and
 * rejects, mirroring how the callers surface stream errors.
 */
export async function consumeSseStream(
  stream: ReadableStream<Uint8Array>,
  onFrame: (frame: SseFrame) => void
): Promise<void> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const iter = splitSseFrames(buffer);
    let next = iter.next();
    while (!next.done) {
      onFrame(next.value);
      next = iter.next();
    }
    buffer = next.value;
  }
}
