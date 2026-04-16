import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ModelComparePanel } from '@/components/ModelComparePanel';

const mockSetSortMode = vi.fn();

vi.mock('@/store/use-app-store', () => ({
  useAppStore: vi.fn((selector) => {
    const store = {
      sortMode: 'costFirst',
      setSortMode: mockSetSortMode,
      getSortedModelsForSelectedScene: () => [
        { id: 'model-1', name: 'Qwen3 Coder', provider: 'Qwen', costPer1KToken: 0.0001, speedRating: 3, qualityRating: 2, capabilityTags: ['code'], recommendationReason: 'Fast and cheap' },
        { id: 'model-2', name: 'DeepSeek V3', provider: 'DeepSeek', costPer1KToken: 0.0005, speedRating: 2, qualityRating: 3, capabilityTags: ['reasoning'], recommendationReason: 'Good quality' },
      ],
    };
    return selector(store);
  }),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      'title': '模型比较',
      'sortCost': '成本优先',
      'sortQuality': '质量优先',
      'sortSpeed': '速度优先',
      'modelName': '模型',
      'speed': '速度',
      'quality': '质量',
      'costPer1K': '成本/1K token',
      'reason': '推荐理由',
    };
    return translations[key] ?? key;
  },
}));

describe('ModelComparePanel', () => {
  it('renders model list', () => {
    render(<ModelComparePanel />);
    expect(screen.getByText('Qwen3 Coder')).toBeInTheDocument();
    expect(screen.getByText('DeepSeek V3')).toBeInTheDocument();
  });

  it('renders sort mode buttons', () => {
    render(<ModelComparePanel />);
    expect(screen.getByText('成本优先')).toBeInTheDocument();
    expect(screen.getByText('质量优先')).toBeInTheDocument();
    expect(screen.getByText('速度优先')).toBeInTheDocument();
  });

  it('clicking sort mode button calls setSortMode', async () => {
    const user = userEvent.setup();
    render(<ModelComparePanel />);
    const qualityBtn = screen.getByText('质量优先');
    await user.click(qualityBtn);
    expect(mockSetSortMode).toHaveBeenCalledWith('qualityFirst');
  });
});
