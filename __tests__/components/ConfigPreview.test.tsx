import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfigPreview } from '@/components/ConfigPreview';

const mockCopyToClipboard = vi.fn().mockResolvedValue(true);
const mockDownloadJson = vi.fn();

vi.mock('@/lib/export-utils', () => ({
  copyToClipboard: () => mockCopyToClipboard(),
  downloadJson: () => mockDownloadJson(),
}));

vi.mock('@/lib/config-generator', () => ({
  generateClawRouteConfig: () => '{\n  "models": {},\n  "agents": {}\n}',
}));

vi.mock('@/store/use-app-store', () => ({
  useAppStore: vi.fn((selector) => {
    const store = {
      selection: {
        primaryModelId: 'qwen/qwen3-coder',
        fallbackModelIds: ['deepseek/deepseek-v3'],
      },
    };
    return selector(store);
  }),
}));

vi.mock('@/components/ui/use-toast', () => ({
  toast: vi.fn(),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      'title': '配置预览',
      'copy': '复制',
      'download': '下载',
      'copiedToClipboard': '已复制到剪贴板',
      'jsonCopied': 'clawroute.json 配置已复制',
      'copyFailedTitle': '复制失败',
      'copyManually': '请手动复制',
      'downloadSuccess': '下载成功',
      'jsonDownloaded': 'clawroute.json 已下载',
    };
    return translations[key] ?? key;
  },
}));

// Mock prism-react-renderer
vi.mock('prism-react-renderer', () => ({
  Highlight: ({ children }: { children: (props: Record<string, unknown>) => React.ReactNode }) =>
    children({ className: '', style: {}, tokens: [], getLineProps: () => ({}), getTokenProps: () => ({}) }),
  themes: { nightOwlLight: {} },
}));

describe('ConfigPreview', () => {
  it('renders config preview title', () => {
    render(<ConfigPreview />);
    expect(screen.getByText('配置预览')).toBeInTheDocument();
  });

  it('renders copy and download buttons', () => {
    render(<ConfigPreview />);
    expect(screen.getByText('复制')).toBeInTheDocument();
    expect(screen.getByText('下载')).toBeInTheDocument();
  });

  it('clicking copy button calls copyToClipboard', async () => {
    const user = userEvent.setup();
    render(<ConfigPreview />);
    const copyBtn = screen.getByText('复制');
    await user.click(copyBtn);
    expect(mockCopyToClipboard).toHaveBeenCalled();
  });

  it('clicking download button calls downloadJson', async () => {
    const user = userEvent.setup();
    render(<ConfigPreview />);
    const downloadBtn = screen.getByText('下载');
    await user.click(downloadBtn);
    expect(mockDownloadJson).toHaveBeenCalled();
  });
});
