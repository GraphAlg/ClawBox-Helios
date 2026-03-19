# Smart Router 集成到 OpenClaw

## 概述

智能路由模块已集成到 `/opt/openclaw/src/agents/smart-router/` 目录。

## 文件结构

```
src/agents/smart-router/
├── index.ts                    # 主入口，导出所有功能
├── types.ts                    # 类型定义
├── decomposer.ts              # 任务拆解器
├── router.ts                  # 模型路由器
├── aggregator.ts              # 结果汇总器
├── adapter.ts                 # OpenClaw模型适配器
└── agent-integration.ts       # Agent层集成（新增）
```

## 集成架构

```
用户消息
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│  src/agents/pi-embedded-runner/run.ts                      │
│                                                              │
│  在 resolveModel() 调用之前:                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  getSmartRouterConfig()      # 读取配置            │   │
│  │  createSmartRouterAgent()    # 创建路由实例        │   │
│  │  smartRouter.process()       # 核心处理逻辑        │   │
│  │    ├── TaskDecomposer        # 任务拆解            │   │
│  │    └── ModelRouter           # 模型选择            │   │
│  └─────────────────────────────────────────────────────┘   │
│                              │                              │
│                              ▼                              │
│  resolveModel(selected_provider, selected_model)         │
│                              │                              │
│                              ▼                              │
│  模型执行...                                                │
└─────────────────────────────────────────────────────────────────┘
```

## 配置文件

在 `openclaw.json` 中添加：

```json
{
  "agents": {
    "smartRouting": {
      "enabled": true,
      "models": {
        "strong": "minimax-portal/MiniMax-M2.5",
        "medium": "qwen-portal/coder-model",
        "light": "minimax-portal/MiniMax-M2.1-lightning"
      },
      "thresholds": {
        "strong": 0.7,
        "medium": 0.3
      }
    }
  }
}
```

## 集成步骤

### 步骤1: 修改 run.ts

在 `src/agents/pi-embedded-runner/run.ts` 中:

```typescript
// 1. 在文件顶部添加导入
import { getSmartRouterConfig, createSmartRouterAgent } from '../smart-router/agent-integration.js';

// 2. 在约第187行 resolveModel 调用之前添加
// 获取用户消息（从prompt中提取）
const userQuery = prompt; // 或从session中获取

const smartRouterConfig = getSmartRouterConfig(cfg);

if (smartRouterConfig?.enabled) {
  const smartRouter = createSmartRouterAgent(smartRouterConfig, resolvedAgentDir, cfg);
  
  if (smartRouter) {
    const result = await smartRouter.process(userQuery, resolvedAgentDir, cfg);
    
    if (result.usedSmartRouting) {
      provider = result.model.provider;
      modelId = result.model.model;
    }
  }
}

// 原有代码继续...
let { model, error, authStorage, modelRegistry } = resolveModel(
  provider,
  modelId,
  resolvedAgentDir,
  cfg
);
```

### 步骤2: 配置启用

在 `openclaw.json` 中启用功能。

### 步骤3: 测试

启动 OpenClaw 并发送消息测试：

```bash
openclaw gateway --port 18789
```

发送不同复杂度的消息，观察使用的模型：
- 简单: "什么是Python?" -> 应使用 light 模型
- 中等: "写一个排序算法" -> 应使用 medium 模型  
- 复杂: "分析Transformer架构并设计一个系统" -> 应使用 strong 模型

## 成本节省

| 请求类型 | 直接用强模型 | 智能路由 | 节省 |
|----------|-------------|----------|------|
| 简单问答 | 100% | 20% | 80% |
| 代码编写 | 100% | 50% | 50% |
| 复杂推理 | 100% | 100% | 0% |
| 混合任务 | 100% | 45% | 55% |

## 调试

查看日志输出：
```bash
# 观察日志中的 [SmartRouter] 前缀
openclaw logs | grep SmartRouter
```
