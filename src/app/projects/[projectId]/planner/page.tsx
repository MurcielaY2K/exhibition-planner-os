import { PlannerPage } from "@/features/planner/components/planner-page";

export default async function PlannerRoute({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  return <PlannerPage projectId={projectId} />;
}
