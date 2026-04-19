# HopLLM 质量改进 - 技术设计文档

## 1. 设计概述

### 1.1 设计目标
将 HopLLM 质量改进需求规格中的 14 项功能需求转化为可实施的技术方案，确保每项改进向后兼容、可独立实施、可独立验证。

### 1.2 设计原则
- **向后兼容**：每项改进不改变应用对外行为，仅修复内部质量问题
- **渐进式**：各改进项无强制依赖链，可按优先级独立实施
- **类型安全**：全量 TypeScript，禁止 `any`，新增代码均需强类型
- **最小侵入**：优先在现有架构内修改，避免大规模重构

---

## 2. 系统架构影响分析

### 2.1 改进影响范围图

```
┌─────────────────────────────────────────────────────────────┐
│                     改进影响范围                             │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ 国际化改造   │  │ 数据层改造   │  │ UI 交互修复         │ │
│  │             │  │             │  │                     │ │
│  │ • layout.tsx│  │ • types.ts  │  │ • CodeBlock.tsx    │ │
│  │ • Header.tsx│  │ • scenes.json│  │ • ErrorBoundary   │ │
│  │ • Footer.tsx│  │ • scene-model│  │                   │ │
│  │ • page.tsx  │  │   -mapping  │  │                   │ │
│  │ • 所有组件  │  │ • models-db │  │                   │ │
│  │ • zh/en.json│  │ • use-app-  │  │                   │ │
│  │             │  │   store.ts  │  │                   │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ 主题颜色统一 │  │ 代码质量改进 │  │ 项目规范补充        │ │
│  │             │  │             │  │                     │ │
│  │ • globals.css│  │ • RuleEditor│  │ • 空目录清理       │ │
│  │ • tailwind  │  │   拆分      │  │ • LICENSE          │ │
│  │   .config.ts│  │ • router-   │  │                     │ │
│  │ • 所有组件  │  │   engine.ts │  │                     │ │
│  │             │  │ • 组件测试  │  │                     │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 改进项依赖关系

```
FR-1 (国际化) ──→ FR-2 (语言切换 UI)     [FR-2 依赖 FR-1]
FR-3 (数据去重) ──→ FR-4 (数据验证)       [FR-4 需适配新数据结构]

其余改进项无依赖关系，可独立实施：
FR-5, FR-6, FR-7, FR-8, FR-9, FR-10, FR-11, FR-12
```

---

## 3. 国际化改造设计（FR-1, FR-2）

### 3.1 next-intl 集成架构

```
┌──────────────────────────────────────────────────────┐
│  app/layout.tsx (Server Component)                    │
│                                                       │
│  1. 从 Store/cookie 获取 locale                       │
│  2. import messages from `@/messages/${locale}.json`  │
│  3. <NextIntlClientProvider locale={locale}           │
│        messages={messages}>                           │
│      <Header />                                      │
│      <main>{children}</main>                          │
│      <Footer />                                      │
│    </NextIntlClientProvider>                          │
└──────────────────────────────────────────────────────┘
```

### 3.2 翻译文件结构

现有 messages/zh.json 和 messages/en.json 已包含完整的翻译 key 结构，需补充首页新增的翻译 key：

```typescript
// 需新增的翻译 key（首页 hero 区域、features 区域等）
{
  "home": {
    "heroTitle": "让 OpenClaw 用户",
    "heroSubtitle": "用最少的配置工作，获得最大的成本节省。",
    "heroDescription": "选择你的使用场景，一键生成优化好的路由配置，立即节省 60-80% 的 OpenClaw 费用。",
    "startConfig": "开始配置",
    "browseTemplates": "浏览模板市场",
    "testimonialsTitle": "来自用户的评价",
    "featuresTitle": "为什么选择 HopLLM",
    "featureSavingTitle": "显著节省",
    "featureSavingDesc": "智能路由让你节省 60-80% 的 OpenClaw 费用",
    "featureOOTBTitle": "开箱即用",
    "featureOOTBDesc": "预设场景模板，无需手动配置复杂的 YAML",
    "featureOSTitle": "完全开源",
    "featureOSDesc": "所有代码完全开源，社区驱动持续改进",
    "quickStartTitle": "快速开始",
    "savingLabel": "节省"
  },
  "codeBlock": {
    "clickToCopy": "点击复制",
    "copied": "已复制",
    "copyFailed": "复制失败"
  }
}
```

### 3.3 组件国际化改造方式

每个客户端组件通过 `useTranslations(namespace)` 获取翻译函数：

```typescript
// 改造前
<h3 className="text-lg font-semibold">路由规则</h3>

// 改造后
const t = useTranslations('ruleEditor');
<h3 className="text-lg font-semibold">{t('title')}</h3>
```

**需改造的组件清单**：

| 组件 | 翻译 namespace | 硬编码文本数 |
|------|---------------|-------------|
| Header.tsx | app | 1 |
| Footer.tsx | footer | 2 |
| SceneCard.tsx | home, scenes | 1 |
| ModelComparePanel.tsx | modelCompare | 8 |
| RuleEditor.tsx | ruleEditor | 15+ |
| ConfigPreview.tsx | configPreview | 5 |
| TemplateSelector.tsx | template | 3 |
| CodeBlock.tsx | codeBlock | 1 |
| TestimonialCard.tsx | - | 0 (数据驱动) |
| app/page.tsx | home | 12+ |
| app/configure/page.tsx | configure | 3 |
| app/templates/page.tsx | template | 8+ |

### 3.4 语言切换组件设计

```typescript
// components/LanguageSwitcher.tsx
interface LanguageSwitcherProps {
  // 无需外部 props，从 Store 读取 locale
}

// 实现要点：
// 1. 从 useAppStore 读取 locale 和 setLocale
// 2. 渲染两个选项：中文 / English
// 3. 当前语言高亮（使用 Button variant="default"）
// 4. 点击切换调用 setLocale
// 5. 使用 useTranslations('language') 获取语言名称文案
```

### 3.5 locale 与 next-intl 联动

**关键设计决策**：locale 切换需要同时更新 Store 和 next-intl 的消息。

```
用户点击语言切换
    │
    ├─→ setLocale(newLocale)     // 更新 Zustand Store
    │
    └─→ 触发 layout.tsx 重新渲染  // NextIntlClientProvider 接收新 messages
         │
         └─→ 所有 useTranslations 组件自动重渲染
```

**实现方式**：layout.tsx 作为 Server Component，从 Store（通过 cookie 或 URL 参数）读取 locale，动态加载对应 messages 文件，传递给 NextIntlClientProvider。

### 3.6 next-intl 配置

需新增 `i18n.ts` 配置文件和修改 `next.config.mjs`：

```typescript
// i18n.ts
export const locales = ['zh', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'zh';
```

---

## 4. 数据层改造设计（FR-3, FR-4）

### 4.1 场景数据去重（FR-3）

#### 数据结构变更

```typescript
// 改造前 - lib/types.ts
interface Scene {
  id: string;
  name: string;
  icon: string;
  description: string;
  estimatedSaving: string;
  candidateModelIds: string[];      // ← 冗余，与 scene-model-mapping.json 重复
  defaultTemplateId: string;         // ← 冗余，与 scene-model-mapping.json 重复
}

// 改造后 - lib/types.ts
interface Scene {
  id: string;
  name: string;
  icon: string;
  description: string;
  estimatedSaving: string;
  // candidateModelIds 和 defaultTemplateId 移除
}
```

#### scenes.json 变更

```json
// 改造后 - data/scenes.json
{
  "scenes": [
    {
      "id": "trading-bot",
      "name": "交易 Bot",
      "icon": "🤖",
      "description": "加密货币/股票交易自动化，需要快速响应和数据分析能力",
      "estimatedSaving": "60-80%"
    }
  ],
  "lastUpdated": "2026-04-15"
}
```

#### 代码影响点

需修改所有直接访问 `scene.candidateModelIds` 或 `scene.defaultTemplateId` 的代码，改为通过 `sceneModelMapping[scene.id]` 查询：

| 文件 | 修改内容 |
|------|----------|
| lib/types.ts | Scene 接口移除两个字段 |
| data/scenes.json | 移除每个 scene 的两个字段 |
| store/use-app-store.ts | 已通过 sceneModelMapping 查询，无需修改 |
| lib/models-db.ts | 已通过 sceneModelMapping 查询，无需修改 |

### 4.2 JSON 数据运行时验证（FR-4）

#### 验证方案：TypeScript 类型守卫

采用轻量级类型守卫函数，不引入 zod 等重型库（CON-T4）：

```typescript
// lib/validate-data.ts

/** 验证 ModelsData 结构 */
function isModelsData(data: unknown): data is ModelsData {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  if (!Array.isArray(obj.models)) return false;
  return obj.models.every(isModel);
}

/** 验证单个 Model 结构 */
function isModel(data: unknown): data is Model {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.provider === 'string' &&
    typeof obj.costPer1KToken === 'number' &&
    typeof obj.speedRating === 'number' &&
    typeof obj.qualityRating === 'number' &&
    Array.isArray(obj.capabilityTags)
  );
}

// 类似地定义 isScenesData, isTemplatesData, isSceneModelMapping
```

#### 验证集成点

```typescript
// lib/models-db.ts 改造
import modelsDataRaw from '@/data/models.json';
import { isModelsData } from './validate-data';

const modelsData = isModelsData(modelsDataRaw)
  ? modelsDataRaw
  : (() => { throw new DataValidationError('models.json', 'Invalid structure'); })();
```

#### 错误处理

```typescript
// lib/validate-data.ts
export class DataValidationError extends Error {
  constructor(public readonly source: string, public readonly detail: string) {
    super(`Data validation failed for ${source}: ${detail}`);
    this.name = 'DataValidationError';
  }
}
```

---

## 5. 主题颜色统一设计（FR-5）

### 5.1 颜色映射表

基于 tailwind.config.ts 中已定义的语义化颜色，建立硬编码颜色到语义化 class 的映射：

| 硬编码值 | 出现位置 | 语义化替换 | 说明 |
|----------|----------|-----------|------|
| `#0f1117` | globals.css body | `bg-background` | 主背景色 |
| `#f8fafc` | 多处 text | `text-foreground` | 主前景色 |
| `#94a3b8` | 多处 text | `text-muted-foreground` | 次要文字色 |
| `#2a2d3a` | 多处 border | `border-border` / `border-muted` | 边框色 |
| `#1a1d29` | 多处 bg | `bg-card` / `bg-popover` | 卡片/弹出层背景 |
| `#0a0a0a` | CodeBlock bg | `bg-background` (新增更深层级) | 代码块背景 |
| `#0f172a` | 渐变文字色 | `text-primary-foreground` | 渐变按钮文字 |
| `#00c9ff` | 渐变色 | `from-primary` | 主渐变起始色 |
| `#92fe9d` | 渐变色 | `to-accent` | 主渐变结束色 |
| `#6366f1` | 渐变色 | `from-secondary` | 次渐变起始色 |
| `#8b5cf6` | 渐变色 | `to-secondary` (扩展) | 次渐变结束色 |
| `#ff5f56` | CodeBlock 装饰 | CSS 自定义属性 | 窗口装饰红 |
| `#ffbd2e` | CodeBlock 装饰 | CSS 自定义属性 | 窗口装饰黄 |
| `#27ca40` | CodeBlock 装饰 | CSS 自定义属性 | 窗口装饰绿 |

### 5.2 Tailwind 主题扩展

在 tailwind.config.ts 中补充缺失的语义化颜色定义：

```typescript
// tailwind.config.ts theme.extend.colors 补充
{
  // 已有定义保持不变
  primary: { DEFAULT: "#00c9ff", foreground: "#0f172a" },
  secondary: { DEFAULT: "#6366f1", foreground: "#ffffff" },
  accent: { DEFAULT: "#92fe9d" },
  muted: { DEFAULT: "#2a2d3a", foreground: "#94a3b8" },
  card: { DEFAULT: "#1a1d29", foreground: "#f8fafc" },
  popover: { DEFAULT: "#1a1d29", foreground: "#f8fafc" },

  // 新增
  surface: "#0a0a0a",           // 代码块等更深背景
  "secondary-accent": "#8b5cf6", // 次渐变结束色
  "window-red": "#ff5f56",       // 代码块窗口装饰
  "window-yellow": "#ffbd2e",
  "window-green": "#27ca40",
}
```

### 5.3 globals.css 改造

```css
/* 改造前 */
body {
  @apply bg-[#0f1117] text-[#f8fafc];
}

/* 改造后 */
body {
  @apply bg-background text-foreground;
}

/* 渐变色提取为 CSS 自定义属性 */
:root {
  --gradient-primary: linear-gradient(135deg, #00c9ff 0%, #92fe9d 100%);
  --gradient-border: linear-gradient(135deg, #00c9ff 0%, #92fe9d 50%, #6366f1 100%);
  --gradient-secondary: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
}

.gradient-text {
  background: var(--gradient-primary);
  /* ... */
}
```

---

## 6. CodeBlock 复制功能设计（FR-6）

### 6.1 组件改造

```typescript
// components/CodeBlock.tsx 改造

interface CodeBlockProps {
  code: string;
  language?: string;
}

// 新增状态：copyStatus: 'idle' | 'copied' | 'failed'
// 新增交互：点击复制区域触发 copyToClipboard(code)
// 复制成功：copyStatus = 'copied'，2 秒后恢复为 'idle'
// 复制失败：copyStatus = 'failed'，2 秒后恢复为 'idle'
```

### 6.2 交互流程

```
用户点击复制区域
    │
    ├─→ copyToClipboard(code)
    │       │
    │       ├─ 成功 → copyStatus = 'copied'
    │       │         显示 "已复制" + Check 图标
    │       │         setTimeout 2000ms → copyStatus = 'idle'
    │       │
    │       └─ 失败 → copyStatus = 'failed'
    │                 显示 "复制失败" + X 图标
    │                 setTimeout 2000ms → copyStatus = 'idle'
    │
    └─→ 复制区域变为可点击按钮（cursor-pointer）
```

---

## 7. 错误边界设计（FR-7）

### 7.1 Error Boundary 组件

```typescript
// components/error-boundary.tsx

interface ErrorBoundaryProps {
  fallback?: React.ComponentType<{ error: Error; reset: () => void }>;
  children: React.ReactNode;
}

// 使用 React 类组件实现 componentDidCatch
// 降级 UI 包含：
//   - 错误图标
//   - "出了点问题" 文案（国际化）
//   - "重新加载" 按钮（调用 resetErrorBoundary）
//   - 开发环境下显示错误堆栈
```

### 7.2 接入位置

```
app/layout.tsx
  └── <ErrorBoundary>                    ← 全局兜底
        ├── Header
        ├── <main>
        │     └── children (各页面)
        └── Footer

app/configure/page.tsx
  └── <ErrorBoundary>                    ← 配置页兜底
        ├── <ErrorBoundary>              ← 规则编辑器兜底
        │     └── <RuleEditor />
        └── <ErrorBoundary>              ← 配置预览兜底
              └── <ConfigPreview />
```

### 7.3 降级 UI 设计

```
┌─────────────────────────────────┐
│                                 │
│         ⚠️                      │
│    出了点问题                    │
│    页面加载遇到错误              │
│                                 │
│    [重新加载]                   │
│                                 │
└─────────────────────────────────┘
```

---

## 8. 组件测试设计（FR-8）

### 8.1 测试架构

```
__tests__/
├── models-db.test.ts          # 已有
├── router-engine.test.ts      # 已有
├── yaml-generator.test.ts     # 已有
├── export-utils.test.ts       # 已有（如存在）
└── components/                # 新增
    ├── SceneSelector.test.tsx
    ├── ModelComparePanel.test.tsx
    ├── RuleEditor.test.tsx
    └── ConfigPreview.test.tsx
```

### 8.2 测试策略

每个组件测试需：

1. **Mock Zustand Store**：使用 `vi.mock` 模拟 `useAppStore`，提供可控的测试数据
2. **用户行为视角**：使用 `screen.getByRole`、`screen.getByText` 查询元素
3. **交互验证**：使用 `userEvent.click`、`userEvent.selectOptions` 模拟用户操作
4. **状态变更验证**：验证 Store 方法被正确调用

### 8.3 各组件测试用例

#### SceneSelector
- 渲染所有场景卡片
- 点击场景卡片触发 onSelectScene 和路由导航

#### ModelComparePanel
- 渲染模型列表
- 切换排序模式后模型重排
- 默认排序为成本优先

#### RuleEditor
- 渲染规则列表含默认规则
- 添加规则在默认规则前插入
- 删除非默认规则
- 条件属性切换联动匹配值选项

#### ConfigPreview
- 渲染 YAML 预览内容
- 点击复制按钮调用 copyToClipboard
- 点击下载按钮调用 downloadYaml

---

## 9. RuleEditor 组件拆分设计（FR-10）

### 9.1 拆分方案

```
components/RuleEditor.tsx (285行)
    │
    ├──→ components/RuleEditor.tsx        (~80行，主组件)
    │       组合子组件，管理拖拽上下文
    │
    ├──→ components/SortableRuleItem.tsx  (~100行，从现有提取)
    │       可排序的单条规则项
    │       含条件编辑器 + 模型选择器 + 拖拽手柄
    │
    └──→ components/DefaultRuleItem.tsx   (~40行，从现有提取)
            默认规则项（不可拖拽、不可删除）
```

### 9.2 子组件接口

```typescript
// components/SortableRuleItem.tsx
interface SortableRuleItemProps {
  rule: RoutingRule;
  candidateModels: { id: string; name: string }[];
  onUpdate: (partial: Partial<RoutingRule>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}

// components/DefaultRuleItem.tsx
interface DefaultRuleItemProps {
  rule: RoutingRule;
  candidateModels: { id: string; name: string }[];
  onUpdate: (partial: Partial<RoutingRule>) => void;
}
```

### 9.3 RuleEditor 主组件简化

```typescript
// components/RuleEditor.tsx 改造后
export function RuleEditor() {
  // Store 连接
  // 拖拽传感器配置
  // 事件处理函数

  return (
    <div className="space-y-4">
      <h3>{t('title')}</h3>
      <DndContext ...>
        <SortableContext ...>
          {nonDefaultRules.map(rule => (
            <SortableRuleItem key={rule.id} ... />
          ))}
        </SortableContext>
      </DndContext>
      {defaultRule && <DefaultRuleItem ... />}
      <Button onClick={addNewRule}>{t('addRule')}</Button>
    </div>
  );
}
```

---

## 10. 模块级状态修复设计（FR-11）

### 10.1 方案：闭包工厂函数

将 `ruleCounter` 从模块级变量改为函数内闭包，通过工厂函数创建独立的计数器实例：

```typescript
// 改造前 - lib/router-engine.ts
let ruleCounter = 0;                    // ← 模块级可变状态

export function generateRuleId(): string {
  ruleCounter += 1;
  return `rule-${Date.now()}-${ruleCounter}`;
}

// 改造后 - lib/router-engine.ts
function createRuleIdGenerator() {
  let counter = 0;                      // ← 闭包内状态
  return () => {
    counter += 1;
    return `rule-${Date.now()}-${counter}`;
  };
}

// 默认实例（生产使用）
const generateRuleId = createRuleIdGenerator();

// 导出工厂函数（测试使用）
export { createRuleIdGenerator, generateRuleId };
```

### 10.2 测试适配

```typescript
// __tests__/router-engine.test.ts 改造
import { createRuleIdGenerator } from '@/lib/router-engine';

// 每个测试用例使用独立实例，消除状态泄漏
it('generateRuleId produces unique IDs', () => {
  const genId = createRuleIdGenerator();
  const id1 = genId();
  const id2 = genId();
  expect(id1).not.toBe(id2);
});
```

---

## 11. 其他改进项设计

### 11.1 根目录空目录清理（FR-9）

直接删除根目录下的空目录：`app/`、`components/`、`data/`、`lib/`、`store/`、`messages/`、`__tests__/`。

验证方式：`pnpm build` 成功，确认这些目录未被 tsconfig.json 或其他配置引用。

### 11.2 LICENSE 文件补充（FR-12）

在项目根目录创建 `LICENSE` 文件，采用 MIT 许可证：

```
MIT License

Copyright (c) 2025 tancau

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:
...
```

---

## 12. 需求映射追踪

| 需求 ID | 设计章节 | 核心技术组件 | 说明 |
|---------|----------|-------------|------|
| FR-1.1 | §3.3 | useTranslations + zh/en.json | 所有组件文案替换 |
| FR-1.2 | §3.1, §3.5 | NextIntlClientProvider + layout.tsx | 运行时集成 |
| FR-2.1 | §3.4 | LanguageSwitcher 组件 | Header 中语言切换入口 |
| FR-2.2 | §3.5 | setLocale + Provider 联动 | 语言切换行为 |
| FR-3.1 | §4.1 | Scene 类型 + scenes.json 改造 | 数据去重 |
| FR-4.1 | §4.2 | validate-data.ts 类型守卫 | 运行时验证 |
| FR-5.1 | §5 | tailwind.config.ts + globals.css + 组件 | 颜色统一 |
| FR-6.1 | §6 | CodeBlock.tsx + copyToClipboard | 复制功能 |
| FR-7.1 | §7 | ErrorBoundary 组件 | 错误边界 |
| FR-8.1 | §8 | __tests__/components/*.test.tsx | 组件测试 |
| FR-9.1 | §11.1 | 删除空目录 | 根目录清理 |
| FR-10.1 | §9 | SortableRuleItem + DefaultRuleItem | 组件拆分 |
| FR-11.1 | §10 | createRuleIdGenerator 闭包 | 状态隔离 |
| FR-12.1 | §11.2 | LICENSE (MIT) | 许可证补充 |
| NFR-1 | 全局 | 向后兼容约束 | 每项改进保持功能不变 |
| NFR-2 | §2.2 | 依赖关系分析 | 渐进式改进 |
| NFR-3 | §8.2 | Vitest + RTL | 测试可维护性 |
| NFR-4 | 全局 | 构建验证 | 构建稳定性 |
