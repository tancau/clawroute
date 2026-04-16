# ClawRoute 质量改进 - 编码任务规划

## 任务概览

- 主任务数：10
- 子任务数：24
- 覆盖需求：FR-1 ~ FR-12（全部 14 项功能需求）+ NFR-1 ~ NFR-4

---

## 1. next-intl 运行时集成与配置

**目标**：配置 next-intl 运行时环境，使翻译功能在应用中生效，为后续组件国际化改造提供基础。

**输入**：design.md §3.1、§3.6
**输出**：i18n.ts 配置文件、next.config.mjs 更新、layout.tsx 集成 NextIntlClientProvider

### 1.1 创建 i18n 配置与更新 next.config

创建 `i18n.ts` 文件，导出 locales 常量和 defaultLocale。更新 `next.config.mjs`，集成 next-intl 的 createNextIntlPlugin 中间件，使 next-intl 在 App Router 中生效。

**验收标准**：
- `i18n.ts` 导出 `locales = ['zh', 'en']` 和 `defaultLocale = 'zh'`
- `next.config.mjs` 正确集成 next-intl 插件
- `pnpm build` 无错误

### 1.2 layout.tsx 集成 NextIntlClientProvider

修改 `app/layout.tsx`，在根布局中引入 NextIntlClientProvider。从 cookies 或默认值获取 locale，动态加载 `messages/${locale}.json`，将 locale 和 messages 传递给 Provider。将 `<html lang="zh">` 改为动态 `lang={locale}`。

**验收标准**：
- NextIntlClientProvider 正确包裹 Header、main、Footer
- 默认 locale 为 'zh'，加载 zh.json 消息
- `<html>` 的 lang 属性随 locale 动态变化
- `pnpm dev` 启动后页面正常渲染

---

## 2. 翻译文件补全与组件文案国际化

**目标**：补全翻译文件中缺失的 key，将所有组件中的硬编码中文替换为 useTranslations 调用。

**输入**：design.md §3.2、§3.3
**输出**：zh.json / en.json 补全、所有组件国际化改造完成

### 2.1 补全翻译文件

在 `messages/zh.json` 和 `messages/en.json` 中补充首页 hero 区域、features 区域、CodeBlock、错误边界等缺失的翻译 key。确保两个文件的 key 结构完全一致。

**验收标准**：
- zh.json 和 en.json 的 key 结构完全一致（可用 diff 工具验证）
- 所有当前硬编码中文文本在 zh.json 中有对应值
- en.json 中所有值均为准确的英文翻译
- 无遗漏的翻译 key

### 2.2 组件硬编码文案替换

逐个改造以下组件，将硬编码中文替换为 `useTranslations(namespace)` 调用：Header.tsx、Footer.tsx、SceneCard.tsx、ModelComparePanel.tsx、RuleEditor.tsx（含 attributeOptions 和 getMatchValueOptions）、ConfigPreview.tsx、TemplateSelector.tsx、CodeBlock.tsx、app/page.tsx、app/configure/page.tsx、app/templates/page.tsx。每个组件添加 `'use client'` 指令（如需），引入 useTranslations，替换所有硬编码文本。

**验收标准**：
- 所有组件中无硬编码中文字符串（除 JSON 数据中的场景名称等数据驱动内容）
- 每个组件的翻译 namespace 与 design.md §3.3 一致
- `pnpm build` 无错误
- 默认中文模式下，页面显示与改造前一致

---

## 3. 语言切换 UI 实现

**目标**：在 Header 中添加语言切换组件，实现中英文切换功能。

**输入**：design.md §3.4、§3.5
**输出**：LanguageSwitcher 组件、Header 集成、locale 联动

### 3.1 实现 LanguageSwitcher 组件

创建 `components/LanguageSwitcher.tsx`，从 useAppStore 读取 locale 和 setLocale，渲染中文/英文两个选项按钮。当前语言使用 `variant="default"` 高亮，非当前语言使用 `variant="outline"`。点击时调用 setLocale 切换语言。

**验收标准**：
- 组件渲染"中文"和"English"两个选项
- 当前 locale 对应的按钮有高亮样式
- 点击按钮调用 setLocale

### 3.2 Header 集成语言切换与 locale 联动

在 Header.tsx 中引入 LanguageSwitcher 组件，放置在 GitHub 链接左侧。实现 locale 与 NextIntlClientProvider 的联动：当 setLocale 被调用时，通过 cookie 存储 locale 值，使 layout.tsx 在下次渲染时读取新 locale 并加载对应 messages。

**验收标准**：
- Header 中显示语言切换组件
- 切换语言后，所有页面文案立即更新为对应语言
- 刷新页面后语言选择保持
- 桌面端和平板端均可见语言切换组件

---

## 4. 数据层改造：去重与验证

**目标**：消除 scenes.json 与 scene-model-mapping.json 的数据冗余，为 JSON 导入添加运行时类型验证。

**输入**：design.md §4.1、§4.2
**输出**：types.ts 更新、scenes.json 去重、validate-data.ts 新增、models-db.ts / use-app-store.ts 验证集成

### 4.1 场景数据去重

修改 `lib/types.ts`，从 Scene 接口中移除 candidateModelIds 和 defaultTemplateId 属性。修改 `data/scenes.json`，移除每个 scene 对象的 candidateModelIds 和 defaultTemplateId 字段。检查并确认 store/use-app-store.ts 和 lib/models-db.ts 已通过 sceneModelMapping 查询，无需额外修改。

**验收标准**：
- Scene 接口不含 candidateModelIds 和 defaultTemplateId
- scenes.json 中每个 scene 不含这两个字段
- `pnpm build` 无错误
- 应用功能与改造前一致（场景选择、模型加载、模板应用正常）

### 4.2 实现运行时数据验证模块

创建 `lib/validate-data.ts`，实现 DataValidationError 类和以下类型守卫函数：isModel、isModelsData、isScene、isScenesData、isTemplate、isTemplatesData、isSceneModelMapping。每个守卫函数验证对应数据结构的必要字段存在且类型正确。

**验收标准**：
- DataValidationError 包含 source 和 detail 属性
- 各类型守卫函数对合法数据返回 true，对非法数据返回 false
- 守卫函数覆盖所有必要字段的类型检查

### 4.3 集成数据验证到导入点

修改 `lib/models-db.ts` 和 `store/use-app-store.ts`，在导入 JSON 数据后调用对应的类型守卫进行验证。验证失败时抛出 DataValidationError，包含数据源名称和具体错误描述。移除现有的 `as` 断言，改用验证后的安全类型转换。

**验收标准**：
- models-db.ts 中 models.json 导入经过 isModelsData 验证
- use-app-store.ts 中 scenes.json、templates.json、scene-model-mapping.json 导入经过验证
- 验证失败时抛出 DataValidationError，错误信息包含数据源名称
- 合法数据下应用正常运行

---

## 5. 主题颜色统一

**目标**：将所有硬编码颜色值替换为 Tailwind 语义化 class 或 CSS 自定义属性。

**输入**：design.md §5
**输出**：tailwind.config.ts 扩展、globals.css 改造、所有组件颜色替换

### 5.1 扩展 Tailwind 主题与改造 globals.css

在 `tailwind.config.ts` 的 theme.extend.colors 中新增 surface、secondary-accent、window-red、window-yellow、window-green 颜色定义。修改 `globals.css`，将 body 的 `bg-[#0f1117] text-[#f8fafc]` 替换为 `bg-background text-foreground`。将渐变色提取为 CSS 自定义属性（--gradient-primary、--gradient-border、--gradient-secondary），更新 .gradient-text 和 .gradient-border 使用 var() 引用。

**验收标准**：
- tailwind.config.ts 新增 5 个颜色定义
- globals.css 中 body 使用语义化 class
- 渐变色使用 CSS 自定义属性
- `pnpm build` 无错误

### 5.2 组件硬编码颜色替换

按照 design.md §5.1 的颜色映射表，逐个替换以下组件中的硬编码颜色：Header.tsx、Footer.tsx、SceneCard.tsx、TestimonialCard.tsx、CodeBlock.tsx、app/page.tsx。将 `text-[#f8fafc]` 替换为 `text-foreground`，`text-[#94a3b8]` 替换为 `text-muted-foreground`，`border-[#2a2d3a]` 替换为 `border-border`，`bg-[#1a1d29]` 替换为 `bg-card`，渐变色 `from-[#00c9ff] to-[#92fe9d]` 替换为 `from-primary to-accent`，等等。

**验收标准**：
- 组件代码中无硬编码十六进制颜色值（`#xxxxxx` 格式）
- 应用视觉效果与改造前一致
- `pnpm build` 无错误

---

## 6. CodeBlock 复制功能实现

**目标**：为 CodeBlock 组件添加点击复制功能，包含成功/失败视觉反馈。

**输入**：design.md §6
**输出**：CodeBlock.tsx 改造完成

### 6.1 实现复制交互与状态反馈

修改 `components/CodeBlock.tsx`，添加 `copyStatus` 状态（'idle' | 'copied' | 'failed'）。将复制区域改为可点击按钮，点击时调用 `copyToClipboard(code)`。成功时 copyStatus 设为 'copied'，显示 Check 图标和"已复制"文案；失败时设为 'failed'，显示 X 图标和"复制失败"文案。2 秒后自动恢复为 'idle' 状态。文案使用 useTranslations('codeBlock') 国际化。

**验收标准**：
- 点击复制区域触发剪贴板复制
- 复制成功显示"已复制"和 Check 图标，2 秒后恢复
- 复制失败显示"复制失败"和 X 图标，2 秒后恢复
- 复制区域有 cursor-pointer 样式
- 文案通过国际化获取

---

## 7. 错误边界接入

**目标**：实现 React Error Boundary 组件，在关键区域接入，防止渲染错误导致白屏。

**输入**：design.md §7
**输出**：error-boundary.tsx 组件、layout.tsx 和 configure/page.tsx 接入

### 7.1 实现 ErrorBoundary 组件

创建 `components/error-boundary.tsx`，使用 React 类组件实现 componentDidCatch 和 getDerivedStateFromError。提供默认降级 UI：错误图标、"出了点问题"标题、"页面加载遇到错误"描述、"重新加载"按钮。支持自定义 fallback 组件。开发环境下显示错误堆栈信息。文案通过 props 传入（因类组件无法使用 Hook），由使用方通过 useTranslations 获取后传入。

**验收标准**：
- 组件渲染出错时展示降级 UI 而非白屏
- 降级 UI 包含"重新加载"按钮
- 支持自定义 fallback 组件
- 开发环境显示错误堆栈

### 7.2 接入 Error Boundary 到关键区域

在 `app/layout.tsx` 中用 ErrorBoundary 包裹 Header + main + Footer（全局兜底）。在 `app/configure/page.tsx` 中用 ErrorBoundary 包裹配置页整体，以及分别包裹 RuleEditor 和 ConfigPreview 区域。

**验收标准**：
- 全局 ErrorBoundary 在 layout.tsx 中生效
- 配置页有独立 ErrorBoundary
- RuleEditor 和 ConfigPreview 各有独立 ErrorBoundary
- 模拟渲染错误时显示降级 UI 而非白屏

---

## 8. RuleEditor 组件拆分与模块级状态修复

**目标**：将 RuleEditor 拆分为子组件，修复 router-engine 模块级状态泄漏。

**输入**：design.md §9、§10
**输出**：SortableRuleItem.tsx、DefaultRuleItem.tsx、RuleEditor.tsx 简化、router-engine.ts 闭包改造

### 8.1 拆分 RuleEditor 为子组件

从 `components/RuleEditor.tsx` 中提取 `SortableRuleItem` 到 `components/SortableRuleItem.tsx`，提取 `DefaultRuleItem` 到 `components/DefaultRuleItem.tsx`。SortableRuleItem 包含拖拽手柄、条件编辑器、模型选择器、上移/下移按钮、删除按钮。DefaultRuleItem 包含"否则"标签、模型选择器、默认规则标签。RuleEditor 主组件仅保留 Store 连接、拖拽上下文配置、事件处理函数和子组件组合。

**验收标准**：
- SortableRuleItem.tsx 和 DefaultRuleItem.tsx 独立存在
- 两个子组件有明确的 Props 接口定义
- RuleEditor.tsx 代码行数不超过 100 行
- 拆分后应用功能与改造前完全一致

### 8.2 修复 router-engine 模块级状态

修改 `lib/router-engine.ts`，将模块级 `let ruleCounter = 0` 替换为闭包工厂函数 `createRuleIdGenerator()`。导出 `createRuleIdGenerator` 和默认实例 `generateRuleId`。更新 `__tests__/router-engine.test.ts`，在需要隔离的测试中使用 `createRuleIdGenerator()` 创建独立实例。

**验收标准**：
- router-engine.ts 中无模块级 `let` 变量
- generateRuleId 仍能生成唯一 ID
- createRuleIdGenerator 导出可用
- 所有现有测试通过
- 多次测试执行间无状态泄漏

---

## 9. React 组件测试补充

**目标**：为核心交互组件添加 React 组件测试，验证 UI 交互行为正确性。

**输入**：design.md §8
**输出**：__tests__/components/ 目录下 4 个测试文件

### 9.1 SceneSelector 与 ModelComparePanel 测试

创建 `__tests__/components/SceneSelector.test.tsx`：mock useAppStore 提供场景数据，验证渲染所有场景卡片、点击卡片触发 selectScene 和路由导航。创建 `__tests__/components/ModelComparePanel.test.tsx`：mock useAppStore 提供模型数据和排序方法，验证渲染模型列表、切换排序模式调用 setSortMode、默认排序为成本优先。

**验收标准**：
- SceneSelector 测试覆盖场景卡片渲染和点击选择
- ModelComparePanel 测试覆盖模型列表渲染和排序切换
- 测试使用 React Testing Library 的 userEvent
- `pnpm test` 全部通过

### 9.2 RuleEditor 与 ConfigPreview 测试

创建 `__tests__/components/RuleEditor.test.tsx`：mock useAppStore 提供规则数据和操作方法，验证渲染规则列表含默认规则、添加规则调用 addNewRule、删除规则调用 removeRuleById。创建 `__tests__/components/ConfigPreview.test.tsx`：mock useAppStore 和 export-utils，验证渲染 YAML 预览内容、点击复制按钮调用 copyToClipboard、点击下载按钮调用 downloadYaml。

**验收标准**：
- RuleEditor 测试覆盖规则增删和默认规则保护
- ConfigPreview 测试覆盖复制和下载交互
- 测试使用 React Testing Library 的 userEvent
- `pnpm test` 全部通过

---

## 10. 项目规范收尾：空目录清理与 LICENSE 补充

**目标**：清理根目录残留空目录，补充开源 LICENSE 文件。

**输入**：design.md §11
**输出**：空目录删除、LICENSE 文件创建

### 10.1 清理根目录空目录

删除项目根目录下的空目录：`app/`、`components/`、`data/`、`lib/`、`store/`、`messages/`、`__tests__/`（仅删除确认无文件的空目录）。删除后执行 `pnpm build` 验证构建不受影响。

**验收标准**：
- 根目录下无上述空目录
- `pnpm build` 成功
- `pnpm dev` 正常启动

### 10.2 补充 MIT LICENSE 文件

在项目根目录创建 `LICENSE` 文件，内容为 MIT 许可证全文，版权年份为 2025，版权持有者为 tancau（与 GitHub 仓库一致）。

**验收标准**：
- 根目录存在 LICENSE 文件
- 文件内容为 MIT 许可证全文
- 包含版权年份和持有者信息

---

## 任务依赖关系

```
1.1 → 1.2 → 2.1 → 2.2 → 3.1 → 3.2
                        ↘
4.1 → 4.2 → 4.3       （数据层改造，与国际化并行）
5.1 → 5.2              （主题颜色，独立）
6.1                    （CodeBlock 复制，独立）
7.1 → 7.2              （错误边界，独立）
8.1                    （RuleEditor 拆分，独立）
8.2                    （router-engine 修复，独立）
9.1 → 9.2              （组件测试，依赖 8.1 完成后的组件结构）
10.1 → 10.2            （项目规范，独立）
```

**关键路径**：1 → 2 → 3（国际化改造链）

**可并行执行**：4（数据层）、5（颜色）、6（CodeBlock）、7（错误边界）、8（代码质量）、10（项目规范）均可在国际化改造完成后或并行实施。

---

## 需求覆盖追踪

| 需求 ID | 任务 ID | 覆盖状态 |
|---------|---------|----------|
| FR-1.1 | 2.1, 2.2 | ✅ |
| FR-1.2 | 1.1, 1.2 | ✅ |
| FR-2.1 | 3.1 | ✅ |
| FR-2.2 | 3.2 | ✅ |
| FR-3.1 | 4.1 | ✅ |
| FR-4.1 | 4.2, 4.3 | ✅ |
| FR-5.1 | 5.1, 5.2 | ✅ |
| FR-6.1 | 6.1 | ✅ |
| FR-7.1 | 7.1, 7.2 | ✅ |
| FR-8.1 | 9.1, 9.2 | ✅ |
| FR-9.1 | 10.1 | ✅ |
| FR-10.1 | 8.1 | ✅ |
| FR-11.1 | 8.2 | ✅ |
| FR-12.1 | 10.2 | ✅ |
| NFR-1 | 全局（每项任务验收标准含向后兼容） | ✅ |
| NFR-2 | 依赖关系设计（多数任务可独立实施） | ✅ |
| NFR-3 | 9.1, 9.2 | ✅ |
| NFR-4 | 每项任务验收标准含 pnpm build 检查 | ✅ |
