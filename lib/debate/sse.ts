import type { DebateEvent } from "./run";

const encoder = new TextEncoder();

export function encodeEvent(e: DebateEvent): Uint8Array {
  if (e.event === "ping") return encoder.encode(": ping\n\n"); // comment line: keeps proxies from closing the stream
  return encoder.encode(`event: ${e.event}\ndata: ${JSON.stringify(e.data)}\n\n`);
}

// Pull-based stream: one event per pull. A client disconnect calls `onCancel` (aborts the debate)
// and stops the generator.
export function eventStream(events: AsyncGenerator<DebateEvent>, onCancel: () => void): ReadableStream<Uint8Array> {
  return new ReadableStream({
    async pull(controller) {
      const { value, done } = await events.next();
      if (done) controller.close();
      else controller.enqueue(encodeEvent(value));
    },
    async cancel() {
      onCancel();
      await events.return(undefined);
    },
  });
}

export const SSE_HEADERS = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
};
