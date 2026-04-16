import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RuleEditor } from '@/components/RuleEditor';

const mockAddNewRule = vi.fn();
const mockRemoveRuleById = vi.fn();
const mockUpdateRuleById = vi.fn();
const mockReorderRuleList = vi.fn();

vi.mock('@/store/use-app-store', () => ({
  useAppStore: vi.fn((selector) => {
    const store = {
      rules: [
        { id: 'rule-1', condition: { attribute: 'complexity', matchValue: 'simple' }, targetModelId: 'model-1', isDefault: false },
        { id: 'rule-default', condition: null, targetModelId: 'model-2', isDefault: true },
      ],
      addNewRule: mockAddNewRule,
      removeRuleById: mockRemoveRuleById,
      reorderRuleList: mockReorderRuleList,
      updateRuleById: mockUpdateRuleById,
      getModelsForSelectedScene: () => [
        { id: 'model-1', name: 'Qwen3 Coder' },
        { id: 'model-2', name: 'DeepSeek V3' },
      ],
    };
    return selector(store);
  }),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      'title': '路由规则',
      'addRule': '添加规则',
      'defaultRule': '默认规则',
      'condition': '当',
      'otherwise': '否则',
      'selectModel': '选择模型',
      'attribute.complexity': '请求复杂度',
      'attribute.hasCode': '包含代码',
      'attribute.needsReasoning': '需要推理',
      'attribute.inputTokenRange': '输入 token 长度',
      'matchValue.simple': '简单',
      'matchValue.medium': '中等',
      'matchValue.complex': '复杂',
      'matchValue.true': '是',
      'matchValue.false': '否',
      'matchValue.short': '短（<1K）',
      'matchValue.long': '长（>10K）',
    };
    return translations[key] ?? key;
  },
}));

describe('RuleEditor', () => {
  it('renders rule list with default rule', () => {
    render(<RuleEditor />);
    expect(screen.getByText('路由规则')).toBeInTheDocument();
    expect(screen.getByText('否则')).toBeInTheDocument();
  });

  it('renders add rule button', () => {
    render(<RuleEditor />);
    expect(screen.getByText(/添加规则/)).toBeInTheDocument();
  });

  it('clicking add rule button calls addNewRule', async () => {
    const user = userEvent.setup();
    render(<RuleEditor />);
    const addBtn = screen.getByText(/添加规则/);
    await user.click(addBtn);
    expect(mockAddNewRule).toHaveBeenCalled();
  });
});
