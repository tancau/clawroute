import modelsData from '@/data/models.json';

export function Footer() {
  return (
    <footer className="border-t mt-auto">
      <div className="container mx-auto flex h-10 items-center justify-between px-4 text-xs text-muted-foreground">
        <span>数据更新日期：{modelsData.lastUpdated}</span>
        <span>ClawRoute - 开源项目</span>
      </div>
    </footer>
  );
}
