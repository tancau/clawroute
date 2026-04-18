'use client';

import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTranslations } from 'next-intl';

interface TemplateFiltersProps {
  searchKeyword: string;
  onSearchChange: (value: string) => void;
  selectedScene: string;
  onSceneChange: (scene: string) => void;
  sceneIds: string[];
  allLabel: string;
}

export function TemplateFilters({
  searchKeyword,
  onSearchChange,
  selectedScene,
  onSceneChange,
  sceneIds,
  allLabel,
}: TemplateFiltersProps) {
  const tScenes = useTranslations('scenes');

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative sm:max-w-xs flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-7" />
        <Input
          placeholder="Search templates..."
          value={searchKeyword}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={selectedScene === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onSceneChange('all')}
        >
          {allLabel}
        </Button>
        {sceneIds.map((id) => (
          <Badge
            key={id}
            variant={selectedScene === id ? 'default' : 'outline'}
            className={`cursor-pointer px-3 py-1 text-sm ${selectedScene === id ? 'bg-brand-primary text-neutral-1' : 'text-neutral-7 hover:text-neutral-10'}`}
            onClick={() => onSceneChange(id)}
          >
            {tScenes(id)}
          </Badge>
        ))}
      </div>
    </div>
  );
}
