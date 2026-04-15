'use client';

import { useMemo } from 'react';
import { useAppStore } from '@/store/use-app-store';
import { generateYaml } from '@/lib/yaml-generator';
import { copyToClipboard, downloadYaml } from '@/lib/export-utils';
import { Button } from '@/components/ui/button';
import { Copy, Download } from 'lucide-react';
import { Highlight, themes } from 'prism-react-renderer';
import { toast } from '@/components/ui/use-toast';

export function ConfigPreview() {
  const rules = useAppStore((s) => s.rules);
  const allModels = useAppStore((s) => s.allModels);

  const yamlContent = useMemo(() => {
    return generateYaml(rules, allModels);
  }, [rules, allModels]);

  const handleCopy = async () => {
    const success = await copyToClipboard(yamlContent);
    if (success) {
      toast({ title: '已复制到剪贴板', description: 'YAML 配置已复制' });
    } else {
      toast({ title: '复制失败', description: '请手动复制', variant: 'destructive' });
    }
  };

  const handleDownload = () => {
    downloadYaml(yamlContent);
    toast({ title: '下载成功', description: 'models.yaml 已下载' });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">配置预览</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy}>
            <Copy className="h-3 w-3 mr-1" />
            复制
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-3 w-3 mr-1" />
            下载
          </Button>
        </div>
      </div>

      <div className="border rounded-md overflow-auto max-h-[400px]">
        <Highlight theme={themes.nightOwlLight} code={yamlContent} language="yaml">
          {({ className, style, tokens, getLineProps, getTokenProps }) => (
            <pre className={`${className} text-xs p-4`} style={style}>
              {tokens.map((line, i) => (
                <div key={i} {...getLineProps({ line })}>
                  {line.map((token, key) => (
                    <span key={key} {...getTokenProps({ token })} />
                  ))}
                </div>
              ))}
            </pre>
          )}
        </Highlight>
      </div>
    </div>
  );
}
