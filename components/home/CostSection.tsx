'use client';

import { CostCalculator } from '@/components/CostCalculator';
import { Section } from '@/components/layout/Section';

export function CostSection() {
  return (
    <Section variant="alternate">
      <CostCalculator />
    </Section>
  );
}
