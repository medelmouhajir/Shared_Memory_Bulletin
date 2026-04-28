import { PageHeader } from "../components/shared/PageHeader";
import { useMemories } from "../hooks/useMemories";
import { relativeTime } from "../lib/time";

export function FeedRoute() {
  const feed = useMemories({ type: "update,info" });
  const rows = feed.data ?? [];
  const subtitle = feed.isLoading ? "Loading…" : rows.length === 1 ? "1 update" : `${rows.length} updates`;

  return (
    <>
      <PageHeader title="Intelligence feed" subtitle={subtitle} />
      <section className="feed">
        {rows.map((memory) => (
          <article className="panel" key={memory.id}>
            <strong>{memory.title}</strong>
            <p>{memory.body}</p>
            <small>
              {memory.created_by ?? "system"} · {relativeTime(memory.created_at)}
            </small>
          </article>
        ))}
      </section>
    </>
  );
}
