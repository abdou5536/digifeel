import { PublicReviewExperience } from '@/src/components/next/PublicReviewExperience';

export default async function PublicChipPage({ params }: { params: Promise<{ chipId: string }> }) {
  const { chipId } = await params;
  return <PublicReviewExperience chipId={chipId} />;
}
