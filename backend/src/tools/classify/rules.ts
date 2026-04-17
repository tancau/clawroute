import type { ToolContext, IntentType } from '../types';

/**
 * 规则定义
 */
interface Rule {
  name: string;
  priority: number;
  condition: (msg: string) => boolean;
  intent: IntentType;
  confidence: number;
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
 * 应用规则引擎
 * 按优先级匹配，返回第一个匹配结果
 */
export async function applyRules(
  message: string,
  _context: ToolContext
): Promise<{
  intent: IntentType;
  confidence: number;
  reasoning?: string;
} | null> {
  // 预处理消息
  const normalizedMsg = message.trim();

  // 按优先级排序
  const sortedRules = [...RULES].sort((a, b) => b.priority - a.priority);

  // 逐条匹配
  for (const rule of sortedRules) {
    try {
      if (rule.condition(normalizedMsg)) {
        return {
          intent: rule.intent,
          confidence: rule.confidence,
          reasoning: `Matched rule: ${rule.name}`,
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
 * 添加自定义规则
 */
export function addRule(rule: Rule): void {
  RULES.push(rule);
  // 重新排序
  RULES.sort((a, b) => b.priority - a.priority);
}
