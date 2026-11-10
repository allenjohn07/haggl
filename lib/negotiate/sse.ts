import type { NegotiationEvent } from "./run";

const encoder = new TextEncoder();

export function encodeEvent({ event, data }: NegotiationEvent): Uint8Array {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

// Pull-based stream: one event per pull, and a client disconnect stops the generator.
export function eventStream(events: AsyncGenerator<NegotiationEvent>): ReadableStream<Uint8Array> {
  return new ReadableStream({
    async pull(controller) {
      const { value, done } = await events.next();
      if (done) controller.close();
      else controller.enqueue(encodeEvent(value));
    },
    async cancel() {
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
