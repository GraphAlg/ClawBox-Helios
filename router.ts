/**
 * 模型路由器 - 根据任务复杂度选择合适的模型
 */
import type { SubTask, RouterConfig, ModelConfig } from "./types.js";

export class ModelRouter {
  private config: RouterConfig;

  constructor(config: RouterConfig) {
    this.config = config;
  }

  /**
   * 根据任务复杂度选择模型
   */
  selectModel(task: SubTask): ModelConfig {
    const { complexity } = task;
    const { thresholds } = this.config;

    if (complexity > thresholds.strong) {
      return this.config.models.strong;
    } else if (complexity > thresholds.medium) {
      return this.config.models.medium;
    } else {
      return this.config.models.light;
    }
  }

  /**
   * 为任务列表选择模型
   */
  selectModels(tasks: SubTask[]): Map<string, ModelConfig> {
    const selections = new Map<string, ModelConfig>();
    
    for (const task of tasks) {
      selections.set(task.id, this.selectModel(task));
    }

    return selections;
  }

  /**
   * 获取模型分布统计
   */
  getModelDistribution(tasks: SubTask[]): Record<string, number> {
    const distribution: Record<string, number> = {
      strong: 0,
      medium: 0,
      light: 0,
    };

    for (const task of tasks) {
      const model = this.selectModel(task);
      if (model.model === this.config.models.strong.model) {
        distribution.strong++;
      } else if (model.model === this.config.models.medium.model) {
        distribution.medium++;
      } else {
        distribution.light++;
      }
    }

    return distribution;
  }

  /**
   * 估算成本节省
   */
  estimateCostSavings(tasks: SubTask[]): {
    withRouter: number;
    allStrong: number;
    savings: number;
    savingsPercent: number;
  } {
    const strongCost = tasks.length;
    let routerCost = 0;

    for (const task of tasks) {
      const model = this.selectModel(task);
      if (model.model === this.config.models.strong.model) {
        routerCost += 1.0;
      } else if (model.model === this.config.models.medium.model) {
        routerCost += 0.5;
      } else {
        routerCost += 0.2;
      }
    }

    return {
      withRouter: routerCost,
      allStrong: strongCost,
      savings: strongCost - routerCost,
      savingsPercent: ((strongCost - routerCost) / strongCost * 100),
    };
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<RouterConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
