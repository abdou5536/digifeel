import { PublicReviewExperience } from '@/src/components/next/PublicReviewExperience';

// Ici le segment d'URL est l'identifiant de la puce : /r/<puce>. Les liens /r/<slug>/t/<table> redirigent vers cette page.
export default async function PublicChipPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: chipId } = await params;
  return <PublicReviewExperience chipId={chipId} />;
}