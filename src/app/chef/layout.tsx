import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Chef',
  description: 'CyberChef, skinned for CyberCalc. Apache-2.0, Crown Copyright.',
};

export default function ChefLayout({ children }: { children: React.ReactNode }) {
  return children;
}
