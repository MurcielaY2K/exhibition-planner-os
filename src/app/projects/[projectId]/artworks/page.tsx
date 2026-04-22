import { ArtworkLibraryPage } from "@/features/planner/components/artwork-library-page";

export default async function ArtworkLibraryRoute({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  return <ArtworkLibraryPage projectId={projectId} />;
}
