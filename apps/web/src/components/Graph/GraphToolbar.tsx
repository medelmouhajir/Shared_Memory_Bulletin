type Props = {
  query: string;
  onQueryChange: (value: string) => void;
  kind: "all" | "agent" | "memory";
  onKindChange: (value: "all" | "agent" | "memory") => void;
  status: "all" | string;
  statuses: string[];
  onStatusChange: (value: string) => void;
  onFitView: () => void;
  onReset: () => void;
};

export function GraphToolbar({
  query,
  onQueryChange,
  kind,
  onKindChange,
  status,
  statuses,
  onStatusChange,
  onFitView,
  onReset,
}: Props) {
  return (
    <section className="graph-toolbar panel" aria-label="Graph controls">
      <label>
        Search
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Node name, id, assignee"
          aria-label="Search graph nodes"
        />
      </label>
      <label>
        Kind
        <select value={kind} onChange={(event) => onKindChange(event.target.value as "all" | "agent" | "memory")}>
          <option value="all">All</option>
          <option value="agent">Agents</option>
          <option value="memory">Memories</option>
        </select>
      </label>
      <label>
        Status
        <select value={status} onChange={(event) => onStatusChange(event.target.value)}>
          <option value="all">All</option>
          {statuses.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>
      <div className="graph-toolbar-actions">
        <button type="button" onClick={onFitView}>
          Fit view
        </button>
        <button type="button" onClick={onReset}>
          Reset filters
        </button>
      </div>
    </section>
  );
}
