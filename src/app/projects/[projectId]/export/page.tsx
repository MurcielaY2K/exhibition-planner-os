import { ExportPage } from "@/features/planner/components/export-page";

export default async function ExportRoute({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  return <ExportPage projectId={projectId} />;
}
