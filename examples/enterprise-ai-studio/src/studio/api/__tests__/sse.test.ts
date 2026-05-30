import { describe, expect, it } from 'vitest';
import { consumeSseStream, splitSseFrames, type SseFrame } from '../sse';

describe('splitSseFrames', () => {
  it('yields complete frames and returns the partial tail', () => {
    const gen = splitSseFrames('data: {"type":"token"}\n\ndata: parti');
    const frames: SseFrame[] = [];
    let next = gen.next();
    while (!next.done) {
      frames.push(next.value);
      next = gen.next();
    }
    expect(frames).toEqual([{ event: 'message', data: '{"type":"token"}' }]);
    expect(next.value).toBe('data: parti');
  });

  it('parses the event: line and joins multiple data: lines', () => {
    const gen = splitSseFrames('event: error\ndata: line1\ndata: line2\n\n');
    const first = gen.next().value as SseFrame;
    expect(first).toEqual({ event: 'error', data: 'line1\nline2' });
  });

  it('defaults the event to "message" and data to "" when absent', () => {
    const gen = splitSseFrames('event: ping\n\n');
    expect(gen.next().value).toEqual({ event: 'ping', data: '' });
  });
});

function streamOf(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let i = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (i < chunks.length) {
        controller.enqueue(encoder.encode(chunks[i++]));
      } else {
        controller.close();
      }
    },
  });
}

describe('consumeSseStream', () => {
  it('reassembles frames split across chunk boundaries', async () => {
    const seen: SseFrame[] = [];
    // The first frame is deliberately split mid-payload across two reads.
    await consumeSseStream(streamOf(['data: {"a":', '1}\n\ndata: {"b":2}\n\n']), (f) =>
      seen.push(f)
    );
    expect(seen).toEqual([
      { event: 'message', data: '{"a":1}' },
      { event: 'message', data: '{"b":2}' },
    ]);
  });

  it('propagates a throw from the frame handler', async () => {
    await expect(
      consumeSseStream(streamOf(['data: boom\n\n']), () => {
        throw new Error('stop');
      })
    ).rejects.toThrow('stop');
  });
});
