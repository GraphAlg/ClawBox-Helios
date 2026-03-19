/**
 * 任务拆解器 - 将用户请求拆分成多个子任务
 */
import type { SubTask, TaskType } from "./types.js";

const TASK_DECOMPOSITION_PROMPT = `分析以下用户请求，智能拆分成多个子任务。

用户请求: {query}

返回JSON格式（直接返回JSON，不要其他内容）:
{
  "tasks": [
    {
      "type": "planning|execution|tool_call|summarization|simple",
      "complexity": 0.0-1.0,
      "description": "任务描述"
    }
  ]
}

任务类型说明:
- planning: 需要深度推理、规划、决策的任务 (complexity: 0.7-1.0)
- execution: 代码生成、内容创作等执行类任务 (complexity: 0.4-0.7)
- tool_call: 需要调用工具、执行命令的任务 (complexity: 0.3-0.5)
- summarization: 总结、摘要、简化类任务 (complexity: 0.2-0.4)
- simple: 简单问答、闲聊类任务 (complexity: 0.1-0.3)

规则:
1. 根据任务实际复杂度评估，不要过度拆分
2. 如果任务简单，直接返回单个任务
3. 确保每个子任务都是原子性的
4. 返回JSON格式，不要有其他内容`;

export class TaskDecomposer {
  private llm: any;

  constructor(llm: any) {
    this.llm = llm;
  }

  /**
   * 拆解用户请求为子任务列表
   */
  async decompose(query: string): Promise<SubTask[]> {
    const prompt = TASK_DECOMPOSITION_PROMPT.replace('{query}', query);
    
    const response = await this.llm.chat([
      { role: 'user', content: prompt }
    ]);

    try {
      const parsed = JSON.parse(response);
      const tasks = parsed.tasks || parsed;
      
      return tasks.map((task: any, index: number) => ({
        id: `task_${Date.now()}_${index}`,
        type: task.type as TaskType,
        complexity: Math.max(0, Math.min(1, parseFloat(task.complexity) || 0.5)),
        description: task.description || '',
        input: query,
      }));
    } catch (e) {
      // 解析失败，返回默认任务
      return [{
        id: `task_${Date.now()}_0`,
        type: this.estimateTaskType(query),
        complexity: this.estimateComplexity(query),
        description: '处理用户请求',
        input: query,
      }];
    }
  }

  /**
   * 基于规则估计任务类型
   */
  private estimateTaskType(query: string): TaskType {
    const q = query.toLowerCase();
    
    if (q.includes('分析') || q.includes('比较') || q.includes('设计') || q.includes('为什么')) {
      return 'planning';
    }
    if (q.includes('写代码') || q.includes('实现') || q.includes('编写')) {
      return 'execution';
    }
    if (q.includes('调用') || q.includes('执行') || q.includes('运行')) {
      return 'tool_call';
    }
    if (q.includes('总结') || q.includes('摘要') || q.includes('简化')) {
      return 'summarization';
    }
    return 'simple';
  }

  /**
   * 基于规则估计复杂度
   */
  private estimateComplexity(query: string): number {
    const q = query.toLowerCase();
    let score = 0.4;

    const complexIndicators = ['分析', '比较', '设计', '系统', '架构', '为什么', '如何实现', '原理', '证明', '多', '复杂', '深度', '全面'];
    const simpleIndicators = ['什么是', '如何', '解释', '翻译', '简单', '基础', '介绍'];

    for (const indicator of complexIndicators) {
      if (q.includes(indicator)) score += 0.15;
    }
    for (const indicator of simpleIndicators) {
      if (q.includes(indicator)) score -= 0.15;
    }

    if (query.length > 200) score += 0.1;
    if (query.length < 20) score -= 0.1;

    return Math.max(0.1, Math.min(1.0, score));
  }
}
