# ClawRouter 分期上线计划

> 基于 STRATEGIC_PLAN.md 制定的分阶段开发与上线方案

---

## 📋 分期总览

| 分期 | 名称 | 目标 | 时间 | 分支名 |
|------|------|------|------|--------|
| **Phase 1** | MVP 优化 | 1000 用户 | Month 1-3 | `feat/phase1-mvp-optimize` |
| **Phase 2** | 资源池系统 | 10000 用户 | Month 4-6 | `feat/phase2-resource-pool` |
| **Phase 3** | 企业版 Beta | 30000 用户 | Month 7-9 | `feat/phase3-enterprise-beta` |
| **Phase 4** | 企业版正式 + 白标 | 50000 用户 | Month 10-12 | `feat/phase4-enterprise-full` |
| **Phase 5** | 国际化 + 分布式原型 | 100K 用户 | Year 2 Q1 | `feat/phase5-global-distributed` |
| **Phase 6** | API 市场 + 开发者生态 | 200K 用户 | Year 2 Q2 | `feat/phase6-api-marketplace` |
| **Phase 7** | 分布式推理网络 | 500K 用户 | Year 2 Q3 | `feat/phase7-distributed-inference` |
| **Phase 8** | 算力池上线 | 1M 用户 | Year 2 Q4 | `feat/phase8-compute-pool` |

---

## 🔧 Phase 1: MVP 优化 (Month 1-3)

### 目标
- ✅ MVP 稳定运行
- 🎯 1000 种子用户
- 📊 建立基础数据收集

### 功能清单
| 功能 | 优先级 | 状态 |
|------|--------|------|
| 场景选择器 | P0 | ✅ 已完成 |
| 规则编辑器 | P0 | ✅ 已完成 |
| 模型对比面板 | P0 | ✅ 已完成 |
| 模板市场 | P1 | ✅ 已完成 |
| 用户认证系统 | P0 | 🔶 部分完成 |
| Dashboard | P1 | 🔶 部分完成 |
| 帮助文档 | P2 | 🔶 部分完成 |
| 使用统计 | P1 | ⬜ 待开发 |
| 成本追踪 | P1 | ⬜ 待开发 |
| 错误监控 | P0 | ⬜ 待开发 |

### 技术要点
- 后端 API 稳定性
- 用户注册/登录流程
- 基础数据埋点
- 错误日志收集

### 分支
```bash
git checkout -b feat/phase1-mvp-optimize
```

---

## 💰 Phase 2: 资源池系统 (Month 4-6)

### 目标
- 🎯 10000 用户
- 💵 分成机制上线
- 🔓 开源评估框架

### 功能清单
| 功能 | 优先级 | 说明 |
|------|--------|------|
| **API Key 资源池** | P0 | 用户贡献闲置 Key |
| Key 管理面板 | P0 | 添加/删除/查看 Key |
| Key 健康检测 | P0 | 定期检测 Key 可用性 |
| **分成机制** | P0 | Key 提供者收益分成 |
| 收益统计 | P1 | 实时收益展示 |
| 提现系统 | P1 | 收益提现流程 |
| **开源评估框架** | P1 | 模型能力评估工具 |
| 模型基准测试 | P2 | 自动化测试流程 |

### 技术要点
- Key 安全加密存储
- 使用量追踪
- 分成计算算法
- 多 Key 轮询策略

### 分支
```bash
git checkout -b feat/phase2-resource-pool
```

---

## 🏢 Phase 3: 企业版 Beta (Month 7-9)

### 目标
- 🎯 30000 用户
- 🏢 企业版 Beta
- 🔌 API 开放平台

### 功能清单
| 功能 | 优先级 | 说明 |
|------|--------|------|
| **企业版核心** | P0 | 企业专属功能 |
| 团队管理 | P0 | 多用户协作 |
| 权限控制 | P0 | 角色权限系统 |
| 审计日志 | P1 | 操作记录追踪 |
| **API 开放平台** | P0 | 开发者 API |
| API Key 管理 | P0 | 开发者 Key 申请 |
| 使用量统计 | P1 | API 调用统计 |
| 文档中心 | P1 | API 文档 |

### 技术要点
- 多租户架构
- RBAC 权限系统
- API Gateway
- 使用量计费

### 分支
```bash
git checkout -b feat/phase3-enterprise-beta
```

---

## 🎨 Phase 4: 企业版正式 + 白标 (Month 10-12)

### 目标
- 🎯 50000 用户
- 💰 $50K MRR
- 🏷️ 白标方案

### 功能清单
| 功能 | 优先级 | 说明 |
|------|--------|------|
| **企业版增强** | P0 | 正式版功能 |
| SSO 登录 | P0 | 企业单点登录 |
| 数据导出 | P1 | 企业数据导出 |
| 定制化路由 | P1 | 企业专属路由策略 |
| **白标方案** | P1 | 品牌定制 |
| 自定义品牌 | P1 | Logo/颜色/域名 |
| 嵌入式方案 | P2 | iframe/API 嵌入 |

### 技术要点
- SSO (SAML/OAuth)
- 品牌定制系统
- 白标部署方案
- SLA 保证

### 分支
```bash
git checkout -b feat/phase4-enterprise-full
```

---

## 🌍 Phase 5: 国际化 + 分布式原型 (Year 2 Q1)

### 目标
- 🎯 100,000 用户
- 💰 $100K MRR
- 🖥️ ClawRouter Node 原型

### 功能清单
| 功能 | 优先级 | 说明 |
|------|--------|------|
| **国际化** | P0 | 多语言支持 |
| 多语言 UI | P0 | i18n 国际化 |
| 区域定价 | P1 | 不同区域定价 |
| **分布式原型** | P1 | 本地算力接入 |
| ClawRouter Node | P1 | 本地节点软件 |
| 本地模型运行 | P2 | vLLM/Ollama 接入 |

### 技术要点
- i18n 架构
- 本地节点通信
- 任务调度原型
- 结果验证机制

### 分支
```bash
git checkout -b feat/phase5-global-distributed
```

---

## 🛒 Phase 6: API 市场 + 开发者生态 (Year 2 Q2)

### 目标
- 🎯 200,000 用户
- 💰 $200K MRR
- 🧑‍💻 开发者生态

### 功能清单
| 功能 | 优先级 | 说明 |
|------|--------|------|
| **API 市场** | P0 | 模型/API 交易 |
| 模型上架 | P0 | 模型提供商入驻 |
| 价格竞争 | P1 | 动态定价机制 |
| **开发者工具** | P0 | 开发者支持 |
| SDK | P0 | 多语言 SDK |
| CLI 工具 | P1 | 命令行工具 |
| 插件系统 | P2 | VSCode/JetBrains 插件 |

### 技术要点
- 市场交易机制
- SDK 开发
- 插件架构
- 开发者文档

### 分支
```bash
git checkout -b feat/phase6-api-marketplace
```

---

## 🌐 Phase 7: 分布式推理网络 (Year 2 Q3)

### 目标
- 🎯 500,000 用户
- 💰 $500K MRR
- ⚡ 分布式推理上线

### 功能清单
| 功能 | 优先级 | 说明 |
|------|--------|------|
| **任务调度系统** | P0 | 分布式任务分配 |
| 智能调度 | P0 | 节点能力匹配 |
| 负载均衡 | P0 | 任务分发优化 |
| **结果验证** | P0 | 输出正确性验证 |
| 多节点验证 | P0 | 交叉验证机制 |
| 抽样检查 | P1 | 质量保证 |
| **激励机制** | P0 | 贡献奖励 |
| 积分系统 | P0 | 贡献量化 |
| 收益结算 | P1 | 自动结算 |

### 技术要点
- Ray/Dask 任务调度
- gRPC 节点通信
- 多节点验证算法
- 积分经济设计

### 分支
```bash
git checkout -b feat/phase7-distributed-inference
```

---

## 🖥️ Phase 8: 算力池上线 (Year 2 Q4)

### 目标
- 🎯 1,000,000 用户
- 💰 $1M MRR
- 🏭 算力池正式运营

### 功能清单
| 功能 | 优先级 | 说明 |
|------|--------|------|
| **算力池运营** | P0 | 本地算力市场 |
| 节点管理 | P0 | 节点注册/监控 |
| 算力定价 | P0 | 动态算力定价 |
| **双重资源池** | P0 | API Key + 算力 |
| 智能路由 | P0 | 自动选择最优方案 |
| 成本对比 | P1 | 实时成本展示 |
| **渠道合作** | P1 | 白标/渠道合作 |
| 合作伙伴平台 | P1 | 渠道管理系统 |

### 技术要点
- 节点信誉系统
- 双重池路由算法
- 渠道合作机制
- 行业标准制定

### 分支
```bash
git checkout -b feat/phase8-compute-pool
```

---

## 📊 分期依赖关系

```
Phase 1 (MVP)
    ↓
Phase 2 (资源池) ← 需要 Phase 1 的用户系统
    ↓
Phase 3 (企业版 Beta) ← 需要 Phase 2 的资源池
    ↓
Phase 4 (企业版正式) ← 需要 Phase 3 的企业功能
    ↓
Phase 5 (国际化 + 分布式原型) ← 需要 Phase 4 的稳定基础
    ↓
Phase 6 (API 市场) ← 需要 Phase 5 的开发者基础
    ↓
Phase 7 (分布式推理) ← 需要 Phase 6 的生态
    ↓
Phase 8 (算力池) ← 需要 Phase 7 的分布式系统
```

---

## 🚀 分支创建计划

### 当前状态
- 当前分支: `feat/dynamic-routing`
- 未提交更改: Phase 1 部分功能

### 建议操作

```bash
# 1. 提交当前 Phase 1 相关更改
cd ~/projects/clawroute
git add .
git commit -m "feat: Phase 1 - MVP optimization (auth, dashboard, backend)"

# 2. 创建 Phase 1 正式分支
git checkout master
git checkout -b feat/phase1-mvp-optimize
git merge feat/dynamic-routing

# 3. 创建后续 Phase 分支（暂为空分支）
git checkout master
git checkout -b feat/phase2-resource-pool
git checkout master
git checkout -b feat/phase3-enterprise-beta
git checkout master
git checkout -b feat/phase4-enterprise-full
git checkout master
git checkout -b feat/phase5-global-distributed
git checkout master
git checkout -b feat/phase6-api-marketplace
git checkout master
git checkout -b feat/phase7-distributed-inference
git checkout master
git checkout -b feat/phase8-compute-pool
```

---

## 📝 测试与合并流程

### 每个 Phase 的标准流程

```
1. 开发阶段
   - 在对应分支开发
   - 本地测试
   - E2E 测试

2. 测试阶段
   - 合并到 test 分支
   - UAT 测试
   - 性能测试

3. 上线阶段
   - 合并到 master
   - 生产部署
   - 监控验证
```

### 测试分支结构

```
master (生产)
    ↑
test-phase1
test-phase2
test-phase3
...
```

---

## 📈 关键里程碑

| 时间 | 里程碑 | 用户 | MRR |
|------|--------|------|-----|
| Month 3 | MVP 稳定 | 1K | $0 |
| Month 6 | 资源池上线 | 10K | $10K |
| Month 9 | 企业版 Beta | 30K | $30K |
| Month 12 | 企业版正式 | 50K | $50K |
| Year 2 Q1 | 国际化 | 100K | $100K |
| Year 2 Q2 | API 市场 | 200K | $200K |
| Year 2 Q3 | 分布式推理 | 500K | $500K |
| Year 2 Q4 | 算力池 | 1M | $1M |

---

*制定时间: 2026-04-17*
*基于: STRATEGIC_PLAN.md*