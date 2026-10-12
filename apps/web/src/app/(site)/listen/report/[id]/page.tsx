import type { Metadata } from 'next';
import { SharedReport } from '@/listen/shared-report';

export const metadata: Metadata = {
  title: 'Site Listener Test report',
  description: 'How well one web page respects what visitors’ browsers ask for.',
  // Reports are shared by link and expire; they shouldn't live on in search results.
  robots: { index: false, follow: false },
};

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 pb-10 pt-14 sm:px-6 sm:pt-20">
      <div className="space-y-2">
        <p className="eyebrow">Site Listener Test</p>
        <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          Does this website listen?
        </h1>
      </div>
      <SharedReport id={id} />
      <p className="text-sm text-muted">
        SeeItMyWay helps websites respect visitor preferences. This automated check doesn&rsquo;t
        make a site accessible and isn&rsquo;t a compliance claim.
      </p>
    </div>
  );
}
