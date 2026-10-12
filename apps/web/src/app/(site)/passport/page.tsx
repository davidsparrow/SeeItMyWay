import type { Metadata } from 'next';
import { PassportBuilder } from '@/passport/passport-builder';

export const metadata: Metadata = {
  title: 'Build your Passport',
  description:
    'Tell the web how you like the web. A preference profile stored on your device, with no account or extension.',
};

export default function PassportPage() {
  return <PassportBuilder />;
}
