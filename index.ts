/**
 * Smart Router 集成到 OpenClaw
 * 
 * 功能：根据任务复杂度自动选择模型，在保持效果的同时节省成本
 * 
 * 集成位置：src/agents/smart-router/
 */

import type { SubTask, RouterConfig, ModelConfig, ExecutionResult, RouterResult } from "./types.js";
import { TaskDecomposer } from "./decomposer.js";
import { ModelRouter } from "./router.js";
import { ResultAggregator } from "./aggregator.js";
import { createModelRegistry, type LLM } from "../models/adapter.js";

/**
 * 从OpenClaw配置创建智能路由器
 */
export function createSmartRouterFromConfig(
  baseLLM: LLM,
  config: RouterConfig,
  modelRegistry?: Map<string, LLM>
): SmartRouter {
  return new SmartRouter(baseLLM, config, modelRegistry);
}

/**
 * 智能路由器主类
 */
export class SmartRouter {
  private decomposer: TaskDecomposer;
  private modelRouter: ModelRouter;
  private aggregator: ResultAggregator;
  private modelRegistry: Map<string, LLM>;

  constructor(
    baseLLM: LLM,
    config: RouterConfig,
    modelRegistry?: Map<string, LLM>
  ) {
    this.decomposer = new TaskDecomposer(baseLLM);
    this.modelRouter = new ModelRouter(config);
    this.aggregator = new ResultAggregator(baseLLM);
    this.modelRegistry = modelRegistry || new Map();
  }

  /**
   * 处理用户请求
   */
  async process(query: string): Promise<RouterResult> {
    // 1. 任务拆解
    const tasks = await this.decomposer.decompose(query);
    
    // 2. 模型分配
    const modelSelections = this.modelRouter.selectModels(tasks);
    
    // 3. 执行子任务
    const results = await this.executeTasks(tasks, modelSelections);
    
    // 4. 结果汇总
    const finalOutput = await this.aggregator.aggregate(tasks, results, query);
    
    // 5. 统计
    const stats = this.aggregator.summarizeResults(results);
    const costEstimate = this.modelRouter.estimateCostSavings(tasks);
    
    return {
      tasks,
      results,
      finalOutput,
      totalCost: costEstimate.savings,
      totalLatencyMs: stats.totalLatencyMs,
      modelDistribution: this.modelRouter.getModelDistribution(tasks),
    };
  }

  /**
   * 执行子任务
   */
  private async executeTasks(
    tasks: SubTask[],
    modelSelections: Map<string, ModelConfig>
  ): Promise<ExecutionResult[]> {
    const results: ExecutionResult[] = [];

    for (const task of tasks) {
      const modelConfig = modelSelections.get(task.id);
      const key = `${modelConfig?.provider}/${modelConfig?.model}`;
      const model = this.modelRegistry.get(key);

      if (!model) {
        results.push({
          taskId: task.id,
          success: false,
          output: '',
          error: `Model not found: ${key}`,
          modelUsed: key,
          latencyMs: 0,
        });
        continue;
      }

      const startTime = Date.now();
      try {
        const output = await model.chat([
          { role: 'user', content: task.input || task.description }
        ]);
        
        results.push({
          taskId: task.id,
          success: true,
          output,
          modelUsed: key,
          latencyMs: Date.now() - startTime,
        });
      } catch (error: any) {
        results.push({
          taskId: task.id,
          success: false,
          output: '',
          error: error.message || 'Execution failed',
          modelUsed: key,
          latencyMs: Date.now() - startTime,
        });
      }
    }

    return results;
  }
}

// Re-export types and components
export * from "./types.js";
export { TaskDecomposer } from "./decomposer.js";
export { ModelRouter } from "./router.js";
export { ResultAggregator } from "./aggregator.js";
export { createModelRegistry, type LLM } from "../models/adapter.js";
