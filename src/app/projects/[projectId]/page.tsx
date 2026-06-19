import { OnSitePage } from "@/features/scene/components/on-site-page";

export default async function ProjectRoute({
  params,
}: PageProps<"/projects/[projectId]">) {
  const { projectId } = await params;

  return <OnSitePage projectId={projectId} />;
}
