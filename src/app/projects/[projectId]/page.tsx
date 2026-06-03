import { ProjectOverviewPage } from "@/features/projects/components/project-overview-page";

export default async function ProjectOverviewRoute({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  return <ProjectOverviewPage projectId={projectId} />;
}
