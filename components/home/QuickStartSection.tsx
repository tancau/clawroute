import { CodeBlock } from '@/components/CodeBlock';
import { Section } from '@/components/layout/Section';

interface QuickStartSectionProps {
  quickStartTitle: string;
  code: string;
}

export function QuickStartSection({ quickStartTitle, code }: QuickStartSectionProps) {
  return (
    <Section title={quickStartTitle}>
      <div className="max-w-3xl mx-auto">
        <CodeBlock code={code} language="python" />
      </div>
    </Section>
  );
}
