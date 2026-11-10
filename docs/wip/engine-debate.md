# engine-debate

Who: the `engine` lane (Claude session).

What: the Spark vs Penny debate engine. Turn loop (max 8 messages), real tools (`check_prices`, `find_alternatives`, `look_closer`), two tap-to-answer asks that pause the stream, no-invented-prices check, validated verdict with rule-based fallback, mock mode, SSE `/api/debate`, `/api/debate/answer`, `/api/buy` with Spark's `create_paypal_order` tool call, `scripts/debate.ts`.

Files: `lib/debate/*`, `app/api/debate/*`, `app/api/buy/*`, `scripts/debate.ts`.

Status: in progress.
