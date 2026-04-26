import type { ToolContext, IntentType } from '../types';
import { getEnabledCustomRules } from '../../db/custom-rules';

/**
 * 规则定义
 */
interface Rule {
  name: string;
  priority: number;
  condition: (msg: string) => boolean;
  intent: IntentType;
  confidence: number;
  isCustom?: boolean;
}

/**
 * 规则配置（用于前端编辑）
 */
export interface RuleConfig {
  id: string;
  name: string;
  type: 'system' | 'custom';
  intent: IntentType;
  priority: number;
  enabled: boolean;
  keyword?: string;   // 仅 custom 规则有
  description?: string; // 仅 system 规则有
}

/**
 * 预定义规则（按优先级排序）
 */
const RULES: Rule[] = [
  // 高优先级：代码相关
  {
    name: 'code_block',
    priority: 100,
    condition: (msg) =>
      msg.includes('```') ||
      /\b(def|function|class|import|export|const|let|var)\s+/.test(msg) ||
      /\b(async|await|return|if|else|for|while)\b/.test(msg),
    intent: 'coding',
    confidence: 0.95,
  },
  {
    name: 'code_keywords',
    priority: 95,
    condition: (msg) =>
      /(写一个|帮我写|创建|实现|重构|debug|调试|代码|函数|组件|API)/.test(
        msg
      ),
    intent: 'coding',
    confidence: 0.90,
  },

  // 交易相关
  {
    name: 'trading',
    priority: 98,
    condition: (msg) =>
      /\b(BTC|ETH|SOL|USDT|BTC-USDT|ETH-USDT)\b/.test(msg) ||
      /(价格|涨跌|交易|持仓|买入|卖出|止损|止盈|仓位|杠杆)/.test(msg),
    intent: 'trading',
    confidence: 0.92,
  },

  // 长文本
  {
    name: 'long_context',
    priority: 90,
    condition: (msg) => msg.length > 4000,
    intent: 'long_context',
    confidence: 0.88,
  },

  // 数学分析
  {
    name: 'math_analysis',
    priority: 85,
    condition: (msg) =>
      /(计算|分析|统计|数学|公式|求解|方程|概率|数据)/.test(msg),
    intent: 'analysis',
    confidence: 0.85,
  },

  // 翻译
  {
    name: 'translation',
    priority: 80,
    condition: (msg) =>
      /(翻译|translate|中文译|英文译|日语译|韩语译|法语译)/.test(msg),
    intent: 'translation',
    confidence: 0.90,
  },

  // 创意写作
  {
    name: 'creative_writing',
    priority: 75,
    condition: (msg) =>
      /(写一篇|创作|故事|小说|文案|诗歌|剧本|角色)/.test(msg),
    intent: 'creative',
    confidence: 0.82,
  },

  // 推理
  {
    name: 'reasoning',
    priority: 70,
    condition: (msg) =>
      /(为什么|原因|逻辑|推理|证明|论点|辩论|思考|分析一下)/.test(msg),
    intent: 'reasoning',
    confidence: 0.78,
  },

  // 知识查询
  {
    name: 'knowledge',
    priority: 65,
    condition: (msg) =>
      /(什么是|解释|介绍|定义|概念|原理|如何|怎样)/.test(msg) &&
      msg.length < 500,
    intent: 'knowledge',
    confidence: 0.75,
  },

  // 中文日常对话
  {
    name: 'chinese_casual',
    priority: 50,
    condition: (msg) =>
      /[\u4e00-\u9fa5]/.test(msg) &&
      msg.length < 300 &&
      !/(代码|函数|分析|翻译)/.test(msg),
    intent: 'casual_chat',
    confidence: 0.70,
  },

  // 英文日常对话
  {
    name: 'english_casual',
    priority: 45,
    condition: (msg) =>
      /^[a-zA-Z\s,.!?']+$/.test(msg) &&
      msg.length < 200 &&
      !/(function|code|analyze|translate)/i.test(msg),
    intent: 'casual_chat',
    confidence: 0.65,
  },
];

/**
 * 加载用户的自定义规则
 */
export async function loadCustomRules(userId: string): Promise<Rule[]> {
  try {
    const customRules = getEnabledCustomRules(userId);
    return customRules.map(rule => ({
      name: `custom:${rule.id}`,
      priority: rule.priority + 1000, // 自定义规则优先级高于预设规则
      condition: (msg: string) => msg.includes(rule.keyword),
      intent: rule.intent,
      confidence: 0.95,
      isCustom: true,
    }));
  } catch (error) {
    console.warn('Failed to load custom rules:', error);
    return [];
  }
}

/**
 * 应用规则引擎
 * 按优先级匹配，返回第一个匹配结果
 */
export async function applyRules(
  message: string,
  context: ToolContext
): Promise<{
  intent: IntentType;
  confidence: number;
  reasoning?: string;
} | null> {
  // 预处理消息
  const normalizedMsg = message.trim();

  // 合并自定义规则
  const customRules = context.user?.id
    ? await loadCustomRules(context.user.id)
    : [];
  const allRules = [...customRules, ...RULES];

  // 按优先级排序
  const sortedRules = allRules.sort((a, b) => b.priority - a.priority);

  // 逐条匹配
  for (const rule of sortedRules) {
    try {
      if (rule.condition(normalizedMsg)) {
        return {
          intent: rule.intent,
          confidence: rule.confidence,
          reasoning: `Matched rule: ${rule.name}${rule.isCustom ? ' (custom)' : ''}`,
        };
      }
    } catch (error) {
      // 规则执行失败，继续下一条
      console.warn(`Rule ${rule.name} failed:`, error);
    }
  }

  // 无匹配
  return null;
}

/**
 * 获取所有规则（用于调试/展示）
 */
export function getRules(): Rule[] {
  return [...RULES].sort((a, b) => b.priority - a.priority);
}

/**
 * 添加自定义规则（仅预设规则）
 */
export function addRule(rule: Rule): void {
  RULES.push(rule);
  // 重新排序
  RULES.sort((a, b) => b.priority - a.priority);
}

/**
 * 系统预设规则的描述映射
 */
const SYSTEM_RULE_DESCRIPTIONS: Record<string, string> = {
  code_block: '检测代码块或代码关键字',
  code_keywords: '检测写代码相关的中文关键词',
  trading: '检测加密货币交易相关词汇',
  long_context: '检测超长消息 (>4000字符)',
  math_analysis: '检测数学分析计算关键词',
  translation: '检测翻译相关关键词',
  creative_writing: '检测创意写作关键词',
  reasoning: '检测逻辑推理关键词',
  knowledge: '检测知识查询短句',
  chinese_casual: '中文日常短对话',
  english_casual: '英文日常短对话',
};

/**
 * 获取所有可编辑的规则（系统预设 + 用户自定义）
 * 系统预设规则不可删除，只能调整优先级和启用/禁用
 * 用户自定义规则可以删除
 */
export function getEditableRules(
  userId?: string,
  customRules: import('../../db/custom-rules').CustomRule[] = []
): RuleConfig[] {
  const systemRules: RuleConfig[] = RULES.map(r => ({
    id: r.name,
    name: r.name,
    type: 'system' as const,
    intent: r.intent,
    priority: r.priority,
    enabled: true,
    description: SYSTEM_RULE_DESCRIPTIONS[r.name] || '',
  }));

  const userCustomRules: RuleConfig[] = customRules.map(r => ({
    id: r.id,
    name: r.keyword,
    type: 'custom' as const,
    intent: r.intent,
    priority: r.priority,
    enabled: r.enabled,
    keyword: r.keyword,
  }));

  return [...userCustomRules, ...systemRules];
}