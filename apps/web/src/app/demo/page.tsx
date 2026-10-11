import type { Metadata } from 'next';
import { DemoExperience } from './demo-experience';

export const metadata: Metadata = {
  title: 'Northlight: an adaptive demo site',
  description:
    'A sample website that adapts to motion, theme, contrast, input, density, detail, visual richness and autoplay preferences, without knowing who you are.',
};

export default function DemoPage() {
  return <DemoExperience />;
}
