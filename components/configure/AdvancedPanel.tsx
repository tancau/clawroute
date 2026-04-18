'use client';

import { ChevronDown, Wrench } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/use-app-store';
import { ApiDiscovery } from '@/components/ApiDiscovery';
import { ConfigImport } from '@/components/ConfigImport';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface AdvancedPanelProps {
  label?: string;
  apiDiscoveryLabel?: string;
  configImportLabel?: string;
}

export function AdvancedPanel({
  label = 'Advanced Tools',
  apiDiscoveryLabel = 'API Discovery',
  configImportLabel = 'Config Import',
}: AdvancedPanelProps) {
  const advancedPanelOpen = useAppStore((s) => s.advancedPanelOpen);
  const setAdvancedPanelOpen = useAppStore((s) => s.setAdvancedPanelOpen);

  return (
    <Collapsible
      open={advancedPanelOpen}
      onOpenChange={setAdvancedPanelOpen}
      className="border border-border-subtle rounded-xl overflow-hidden"
    >
      <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium text-neutral-7 hover:text-neutral-10 hover:bg-surface-overlay/50 transition-colors duration-fast">
        <div className="flex items-center gap-2">
          <Wrench className="h-4 w-4" />
          {label}
        </div>
        <ChevronDown className={cn('h-4 w-4 transition-transform duration-normal', advancedPanelOpen && 'rotate-180')} />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 pb-4">
        <Tabs defaultValue="api-discovery" className="mt-3">
          <TabsList className="w-full">
            <TabsTrigger value="api-discovery" className="flex-1">{apiDiscoveryLabel}</TabsTrigger>
            <TabsTrigger value="config-import" className="flex-1">{configImportLabel}</TabsTrigger>
          </TabsList>
          <TabsContent value="api-discovery">
            <ApiDiscovery />
          </TabsContent>
          <TabsContent value="config-import">
            <ConfigImport />
          </TabsContent>
        </Tabs>
      </CollapsibleContent>
    </Collapsible>
  );
}
