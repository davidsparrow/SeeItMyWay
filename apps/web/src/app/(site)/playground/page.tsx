import type { Metadata } from 'next';
import { Playground } from '@/playground/playground';

export const metadata: Metadata = {
  title: 'See the difference',
  description:
    'Preview how one website responds to motion, theme, contrast, transparency and SeeItMyWay preferences.',
};

export default function PlaygroundPage() {
  return <Playground />;
}
