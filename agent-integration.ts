/**
 * Smart Router 集成到 OpenClaw Agent 层
 * 
 * 文件: src/agents/smart-router/agent-integration.ts
 * 
 * 集成位置: src/agents/pi-embedded-runner/run.ts
 */

import type { OpenClawConfig } from "../../config/config.js";
import { resolveModel } from "../pi-embedded-runner/model.js";
import { TaskDecomposer } from "./decomposer.js";
import { ModelRouter } from "./router.js";
import type { SubTask, RouterConfig, ExecutionResult } from "./types.js";

/**
 * Smart Router 配置
 */
export interface SmartRouterConfig {
  enabled: boolean;
  models: {
    strong: { provider: string; model: string };
    medium: { provider: string; model: string };
    light: { provider: string; model: string };
  };
  thresholds: {
    strong: number;
    medium: number;
  };
}

/**
 * 从 OpenClaw 配置中获取 Smart Router 配置
 */
export function getSmartRouterConfig(cfg: OpenClawConfig): SmartRouterConfig | null {
  const smartRouting = cfg.agents?.smartRouting;
  if (!smartRouting?.enabled) {
    return null;
  }
  
  return {
    enabled: true,
    models: {
      strong: parseModelString(smartRouting.models?.strong || 'minimax-portal/MiniMax-M2.5'),
      medium: parseModelString(smartRouting.models?.medium || 'qwen-portal/coder-model'),
      light: parseModelString(smartRouting.models?.light || 'minimax-portal/MiniMax-M2.1-lightning'),
    },
    thresholds: {
      strong: smartRouting.thresholds?.strong ?? 0.7,
      medium: smartRouting.thresholds?.medium ?? 0.3,
    },
  };
}

/**
 * 解析模型字符串 "provider/model"
 */
function parseModelString(str: string): { provider: string; model: string } {
  const parts = str.split('/');
  return {
    provider: parts[0] || 'minimax-portal',
    model: parts[1] || 'MiniMax-M2.5',
  };
}

/**
 * Smart Router Agent 集成类
 */
export class SmartRouterAgent {
  private config: SmartRouterConfig;
  private baseModel: any;
  
  constructor(config: SmartRouterConfig, baseModel: any) {
    this.config = config;
    this.baseModel = baseModel;
  }
  
  /**
   * 处理用户请求 - 核心集成点
   * 
   * 在 run.ts 的 resolveModel 之前调用此方法
   */
  async process(
    query: string,
    agentDir?: string,
    cfg?: OpenClawConfig
  ): Promise<{
    // 应该使用的模型
    model: { provider: string; model: string };
    // 是否使用了智能路由
    usedSmartRouting: boolean;
    // 任务拆解结果（用于调试）
    tasks?: SubTask[];
  }> {
    console.log('[SmartRouter] Processing query:', query.substring(0, 50) + '...');
    
    // 1. 任务拆解
    const decomposer = new TaskDecomposer(this.baseModel);
    const tasks = await decomposer.decompose(query);
    console.log('[SmartRouter] Decomposed tasks:', tasks.length);
    
    // 2. 模型选择
    const routerConfig: RouterConfig = {
      enabled: true,
      models: this.config.models,
      thresholds: this.config.thresholds,
    };
    const modelRouter = new ModelRouter(routerConfig);
    
    // 选择第一个任务的模型（简化版本）
    const primaryTask = tasks[0];
    const selectedModel = modelRouter.selectModel(primaryTask);
    
    console.log('[SmartRouter] Selected model:', selectedModel.provider + '/' + selectedModel.model);
    console.log('[SmartRouter] Task complexity:', primaryTask.complexity);
    
    // 3. 返回建议的模型
    return {
      model: {
        provider: selectedModel.provider,
        model: selectedModel.model,
      },
      usedSmartRouting: true,
      tasks,
    };
  }
}

/**
 * 创建 Smart Router Agent
 */
export function createSmartRouterAgent(
  config: SmartRouterConfig,
  agentDir?: string,
  cfg?: OpenClawConfig
): SmartRouterAgent | null {
  if (!config.enabled) {
    return null;
  }
  
  // 使用强模型作为基础LLM（用于任务拆解）
  const baseModel = {
    chat: async (messages: any[]) => {
      // 这里需要调用真实的OpenClaw模型
      // 暂时返回模拟数据
      return JSON.stringify({
        tasks: [{ type: 'simple', complexity: 0.5, description: '处理请求' }]
      });
    }
  };
  
  return new SmartRouterAgent(config, baseModel);
}

// ========== 集成示例代码 ==========
/*
 
 要在 src/agents/pi-embedded-runner/run.ts 中集成，需要修改以下部分：
 
 1. 导入:
 ---
 import { getSmartRouterConfig, createSmartRouterAgent } from '../smart-router/agent-integration.js';
 
 2. 在 run.ts 的约第187行 resolveModel 调用之前添加:
 ---
 // 获取配置
 const smartRouterConfig = getSmartRouterConfig(cfg);
 
 if (smartRouterConfig?.enabled) {
   // 创建 Smart Router
   const smartRouter = createSmartRouterAgent(smartRouterConfig, resolvedAgentDir, cfg);
   
   if (smartRouter) {
     // 处理用户请求
     const result = await smartRouter.process(prompt, resolvedAgentDir, cfg);
     
     if (result.usedSmartRouting) {
       // 使用 Smart Router 选择的模型
       provider = result.model.provider;
       modelId = result.model.model;
       console.log('[SmartRouter] Using model:', provider + '/' + modelId);
     }
   }
 }
 
 // 继续原有的 resolveModel 调用
 let { model, error, authStorage, modelRegistry } = resolveModel(
   provider,
   modelId,
   resolvedAgentDir,
   cfg
 );
 
 */
