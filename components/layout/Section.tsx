import { cn } from '@/lib/utils';

interface SectionProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  variant?: 'default' | 'alternate';
  className?: string;
  id?: string;
}

export function Section({ title, description, children, variant = 'default', className, id }: SectionProps) {
  return (
    <section
      id={id}
      className={cn(
        'py-16',
        variant === 'alternate' ? 'bg-surface-raised' : 'bg-surface-base',
        className
      )}
    >
      <div className="container mx-auto px-4">
        {(title || description) && (
          <div className="mb-8 text-center">
            {title && (
              <h2 className="text-3xl font-bold tracking-tight mb-2">{title}</h2>
            )}
            {description && (
              <p className="text-neutral-7 text-lg max-w-2xl mx-auto">{description}</p>
            )}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}
