import providersData from '@/data/providers.json';

export function Footer() {
  return (
    <footer className="border-t border-[#2a2d3a] mt-auto">
      <div className="container mx-auto flex h-12 items-center justify-between px-4 text-xs text-[#94a3b8]">
        <span>数据更新日期：{providersData.lastUpdated}</span>
        <span className="gradient-text font-semibold">ClawRouter - 开源项目</span>
      </div>
    </footer>
  );
}
