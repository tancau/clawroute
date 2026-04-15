import Link from 'next/link';
import { SceneSelector } from '@/components/SceneSelector';
import { Button } from '@/components/ui/button';
import { Store } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold tracking-tight mb-3">
          你用 OpenClaw 做什么？
        </h1>
        <p className="text-muted-foreground text-lg">
          选择场景，获取最优配置
        </p>
      </div>
      <SceneSelector />
      <div className="mt-8">
        <Link href="/templates">
          <Button variant="outline" className="gap-2">
            <Store className="h-4 w-4" />
            浏览模板市场
          </Button>
        </Link>
      </div>
    </div>
  );
}
