import { ProjectOverviewPage } from "@/features/projects/components/project-overview-page";

export default async function ProjectOverviewRoute({
  params,
}: PageProps<"/projects/[projectId]">) {
  const { projectId } = await params;

  return <ProjectOverviewPage projectId={projectId} />;
}
