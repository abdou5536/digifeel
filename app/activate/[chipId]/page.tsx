import { ActivationExperience } from '@/src/components/next/ActivationExperience';

export default async function ActivateChipPage({ params }: { params: Promise<{ chipId: string }> }) {
  const { chipId } = await params;
  return <ActivationExperience chipId={chipId} />;
}
