import { DependencyGraph } from "../components/Graph/DependencyGraph";
import { PageHeader } from "../components/shared/PageHeader";

export function GraphRoute() {
  return (
    <>
      <PageHeader title="Dependency graph" subtitle="Workflow memory links" />
      <DependencyGraph />
    </>
  );
}
