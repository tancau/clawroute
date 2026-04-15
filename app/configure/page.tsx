'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import { useAppStore } from '@/store/use-app-store';
import { ModelComparePanel } from '@/components/ModelComparePanel';
import { RuleEditor } from '@/components/RuleEditor';
import { ConfigPreview } from '@/components/ConfigPreview';
import { TemplateSelector } from '@/components/TemplateSelector';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

function ConfigureContent() {
  const searchParams = useSearchParams();
  const sceneId = searchParams.get('scene');
  const selectedSceneId = useAppStore((s) => s.selectedSceneId);
  const selectScene = useAppStore((s) => s.selectScene);
  const scenes = useAppStore((s) => s.scenes);

  useEffect(() => {
    if (sceneId && sceneId !== selectedSceneId) {
      selectScene(sceneId);
    }
  }, [sceneId, selectedSceneId, selectScene]);

  const currentScene = scenes.find((s) => s.id === (selectedSceneId ?? sceneId));

  if (!currentScene) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">请先选择一个使用场景</p>
        <Link href="/">
          <Button variant="outline">返回首页</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6">
      {/* Scene breadcrumb */}
      <div className="flex items-center gap-2 mb-6">
        <span className="text-2xl">{currentScene.icon}</span>
        <h2 className="text-xl font-semibold">{currentScene.name}</h2>
        <Link href="/" className="text-sm text-muted-foreground hover:underline ml-2">
          切换场景
        </Link>
      </div>

      {/* Main layout: left panel (model compare) + right panel (rules + preview) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Model comparison + Templates */}
        <div className="space-y-6">
          <ModelComparePanel />
          <TemplateSelector />
        </div>

        {/* Right: Rule editor + Config preview */}
        <div className="space-y-6">
          <RuleEditor />
          <ConfigPreview />
        </div>
      </div>
    </div>
  );
}

export default function ConfigurePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">加载中...</div>}>
      <ConfigureContent />
    </Suspense>
  );
}
