/**
 * 智能路由类型定义
 */

export type TaskType = 
  | 'planning'      // 规划、推理、思考
  | 'execution'     // 代码生成、内容创作
  | 'tool_call'     // 工具调用、执行命令
  | 'summarization' // 总结、摘要
  | 'simple';       // 简单问答

export interface SubTask {
  id: string;
  type: TaskType;
  complexity: number;  // 0-1
  description: string;
  input: string;
  output?: string;
  model?: string;
}

export interface RouterConfig {
  enabled: boolean;
  models: {
    strong: ModelConfig;
    medium: ModelConfig;
    light: ModelConfig;
  };
  thresholds: {
    strong: number;
    medium: number;
  };
}

export interface ModelConfig {
  provider: string;
  model: string;
}

export interface ExecutionResult {
  taskId: string;
  success: boolean;
  output: string;
  error?: string;
  modelUsed: string;
  tokensUsed?: number;
  latencyMs: number;
}

export interface RouterResult {
  tasks: SubTask[];
  results: ExecutionResult[];
  finalOutput: string;
  totalCost: number;
  totalLatencyMs: number;
  modelDistribution: Record<string, number>;
}
