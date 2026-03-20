import { WorkerPortal } from "@/components/worker/worker-portal";

export default async function WorkerPortalPage({
  params
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return <WorkerPortal token={token} />;
}
