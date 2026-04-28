import { OpenClawAgent } from "@openclaw/sdk";

const agent = new OpenClawAgent(
  Bun.env.OPENCLAW_URL ?? "http://localhost:3000",
  Bun.env.OPENCLAW_AGENT_ID ?? "agent-example",
  Bun.env.OPENCLAW_TOKEN ?? "",
);

setInterval(() => {
  agent.heartbeat().catch((error) => console.error("heartbeat failed", error));
}, 30_000);

async function loop() {
  const inbox = await agent.getInbox();
  for (const memory of inbox) {
    await agent.ack(memory.id);
    await agent.startWork(memory.id);
    await agent.finish(memory.id, `Handled by ${Bun.env.OPENCLAW_AGENT_ID ?? "agent-example"}`);
  }
}

setInterval(() => {
  loop().catch((error) => console.error("agent loop failed", error));
}, 5_000);
