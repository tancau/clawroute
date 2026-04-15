import { Copy } from 'lucide-react';

interface CodeBlockProps {
  code: string;
  language?: string;
}

export function CodeBlock({ code, language = 'bash' }: CodeBlockProps) {
  return (
    <div className="rounded-xl overflow-hidden border border-[#2a2d3a]">
      <div className="flex items-center justify-between px-4 py-3 bg-[#1a1d29] border-b border-[#2a2d3a]">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
          <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
          <div className="w-3 h-3 rounded-full bg-[#27ca40]"></div>
        </div>
        <span className="text-xs text-[#94a3b8] font-mono">{language}</span>
        <span className="text-xs text-[#94a3b8] flex items-center gap-1">
          <Copy className="w-4 h-4" />
          点击复制
        </span>
      </div>
      <div className="p-4 bg-[#0a0a0a]">
        <pre className="font-mono text-sm text-[#f8fafc] whitespace-pre-wrap">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
}
