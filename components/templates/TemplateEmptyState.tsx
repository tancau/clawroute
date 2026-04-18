import { PackageSearch } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';

interface TemplateEmptyStateProps {
  title: string;
  description?: string;
  onClearFilters?: () => void;
  clearLabel?: string;
}

export function TemplateEmptyState({ title, description, onClearFilters, clearLabel }: TemplateEmptyStateProps) {
  return (
    <EmptyState
      icon={PackageSearch}
      title={title}
      description={description}
      actionLabel={clearLabel}
      onAction={onClearFilters}
    />
  );
}
