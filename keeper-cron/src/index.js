// Scheduled Worker: asks the LairHub app to pay hosts whose guest never confirmed.
// The payout logic lives in the app's /api/keeper route; this Worker only wakes it up on a schedule.

async function runKeeper(env) {
  const res = await env.LAIRHUB.fetch(
    new Request("https://lairhub.internal/api/keeper", {
      headers: { authorization: `Bearer ${env.CRON_SECRET}` },
    })
  );
  const body = await res.text();
  console.log(`keeper ${res.status}: ${body}`);
  if (!res.ok) throw new Error(`keeper failed with ${res.status}: ${body}`);
}

export default {
  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(runKeeper(env));
  },
  // Visiting this Worker directly does nothing; it exists only for the schedule.
  async fetch() {
    return new Response("lairhub keeper cron", { status: 200 });
  },
};
