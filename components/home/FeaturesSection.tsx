import { Zap, RefreshCw, DollarSign } from 'lucide-react';
import { Section } from '@/components/layout/Section';

interface FeaturesSectionProps {
  featuresTitle: string;
  featureRoutingTitle: string;
  featureRoutingDesc: string;
  featureStreamingTitle: string;
  featureStreamingDesc: string;
  featureBillingTitle: string;
  featureBillingDesc: string;
}

const features = [
  {
    icon: Zap,
    gradient: 'from-brand-primary to-brand-accent',
    hoverBorder: 'hover:border-brand-primary/30',
    key: 'routing',
  },
  {
    icon: RefreshCw,
    gradient: 'from-brand-secondary to-brand-accent',
    hoverBorder: 'hover:border-brand-secondary/30',
    key: 'streaming',
  },
  {
    icon: DollarSign,
    gradient: 'from-brand-accent to-brand-primary',
    hoverBorder: 'hover:border-brand-accent/30',
    key: 'billing',
  },
];

export function FeaturesSection({
  featuresTitle,
  featureRoutingTitle,
  featureRoutingDesc,
  featureStreamingTitle,
  featureStreamingDesc,
  featureBillingTitle,
  featureBillingDesc,
}: FeaturesSectionProps) {
  const titles = [featureRoutingTitle, featureStreamingTitle, featureBillingTitle];
  const descs = [featureRoutingDesc, featureStreamingDesc, featureBillingDesc];

  return (
    <Section title={featuresTitle}>
      <div className="max-w-5xl mx-auto">
        <div className="grid md:grid-cols-3 gap-6">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.key}
                className={`p-6 rounded-xl border border-border-subtle bg-surface-overlay/50 ${feature.hoverBorder} transition-colors duration-fast`}
              >
                <div className={`w-10 h-10 mb-4 rounded-lg bg-gradient-to-br ${feature.gradient} flex items-center justify-center`}>
                  <Icon className="w-5 h-5 text-neutral-1" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-neutral-10">{titles[i]}</h3>
                <p className="text-sm text-neutral-7 leading-relaxed">{descs[i]}</p>
              </div>
            );
          })}
        </div>
      </div>
    </Section>
  );
}
