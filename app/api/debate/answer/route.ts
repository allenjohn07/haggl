import { z } from "zod";
import { answerAsk } from "@/lib/debate/store";

// POST /api/debate/answer { debateId, askId, answer } -> 204. Resumes the paused debate stream.

const Body = z.object({ debateId: z.string().min(1).max(100), askId: z.string().min(1).max(100), answer: z.string().min(1).max(100) });

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "debateId, askId and answer are required" }, { status: 400 });

  const { debateId, askId, answer } = parsed.data;
  const result = answerAsk(debateId, askId, answer);
  if (result === "not_found") return Response.json({ error: "Unknown debate or question" }, { status: 404 });
  if (result === "already_answered") return Response.json({ error: "Already answered" }, { status: 409 });
  if (result === "not_an_option") return Response.json({ error: "Pick one of the options" }, { status: 400 });
  return new Response(null, { status: 204 });
}
