import { cn } from '@/lib/utils';
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';

type FeedbackVariant = 'success' | 'error' | 'warning' | 'info';

interface InlineFeedbackProps {
  variant: FeedbackVariant;
  message: string;
  className?: string;
}

const variantConfig: Record<FeedbackVariant, { icon: typeof CheckCircle; colorClass: string; bgClass: string }> = {
  success: { icon: CheckCircle, colorClass: 'text-semantic-success', bgClass: 'bg-semantic-success/10' },
  error: { icon: XCircle, colorClass: 'text-semantic-error', bgClass: 'bg-semantic-error/10' },
  warning: { icon: AlertTriangle, colorClass: 'text-semantic-warning', bgClass: 'bg-semantic-warning/10' },
  info: { icon: Info, colorClass: 'text-semantic-info', bgClass: 'bg-semantic-info/10' },
};

export function InlineFeedback({ variant, message, className }: InlineFeedbackProps) {
  const { icon: Icon, colorClass, bgClass } = variantConfig[variant];

  return (
    <div className={cn('flex items-center gap-2 px-3 py-2 rounded-md text-sm', bgClass, colorClass, className)}>
      <Icon className="h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
