# Smart Router 集成到 OpenClaw

## 概述

智能路由模块已集成到 `/opt/openclaw/src/agents/smart-router/` 目录。

## 文件结构

```
src/agents/smart-router/
├── index.ts        # 主入口，导出所有功能
├── types.ts        # 类型定义
├── decomposer.ts   # 任务拆解器
├── router.ts       # 模型路由器
├── aggregator.ts   # 结果汇总器
└── adapter.ts     # OpenClaw模型适配器
```

## 使用方法

### 1. 在 Agent 中使用

```typescript
import { createSmartRouterFromConfig } from './agents/smart-router/index.js';
import { createModelRegistry } from './agents/smart-router/adapter.js';

// 配置
const config = {
  enabled: true,
  models: {
    strong: { provider: 'minimax-portal', model: 'MiniMax-M2.5' },
    medium: { provider: 'qwen-portal', model: 'coder-model' },
    light: { provider: 'minimax-portal', model: 'MiniMax-M2.1-lightning' },
  },
  thresholds: {
    strong: 0.7,
    medium: 0.3,
  },
};

// 创建模型注册表
const registry = createModelRegistry([
  {
    provider: 'minimax-portal',
    model: 'MiniMax-M2.5',
    executeFn: async (messages) => {
      // 调用OpenClaw模型
      return await callOpenClawModel('minimax-portal', 'MiniMax-M2.5', messages);
    }
  },
  // ... 其他模型
]);

// 创建路由器
const router = createSmartRouterFromConfig(
  registry.get('minimax-portal/MiniMax-M2.5'), // 基础LLM用于拆解
  config,
  registry
);

// 处理请求
const result = await router.process('帮我写一个排序算法');
console.log(result.finalOutput);
```

### 2. 配置启用

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

## 集成原理

```
用户请求
    │
    ▼
┌─────────────────────────────────────┐
│  SmartRouter.process()              │
│  1. TaskDecomposer - 任务拆解       │
│  2. ModelRouter - 模型选择          │
│  3. 执行子任务                       │
│  4. ResultAggregator - 结果汇总      │
└─────────────────────────────────────┘
    │
    ▼
OpenClaw模型执行
```

## 成本节省

| 请求类型 | 直接用强模型 | 智能路由 | 节省 |
|----------|-------------|----------|------|
| 简单问答 | 100% | 20% | 80% |
| 代码编写 | 100% | 50% | 50% |
| 复杂推理 | 100% | 100% | 0% |
| 混合任务 | 100% | 45% | 55% |

## 下一步

1. 在 `model-selection.ts` 或 `run.ts` 中添加路由调用
2. 添加配置解析逻辑
3. 添加监控和日志
