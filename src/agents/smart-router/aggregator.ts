/**
 * 结果汇总器 - 合并多个子任务的结果
 */
import type { SubTask, ExecutionResult } from "./types.js";

export class ResultAggregator {
  private llm: any;

  constructor(llm: any) {
    this.llm = llm;
  }

  /**
   * 汇总多个子任务的结果
   */
  async aggregate(
    tasks: SubTask[],
    results: ExecutionResult[],
    query: string
  ): Promise<string> {
    const successfulResults = results.filter(r => r.success);
    
    if (successfulResults.length === 0) {
      return '所有子任务执行失败';
    }

    if (successfulResults.length === 1) {
      return successfulResults[0].output;
    }

    // 多个结果，用LLM汇总
    return await this.llmAggregate(tasks, results, query);
  }

  /**
   * 使用LLM进行智能汇总
   */
  private async llmAggregate(
    tasks: SubTask[],
    results: ExecutionResult[],
    query: string
  ): Promise<string> {
    const resultsText = tasks.map((task, index) => {
      const result = results[index];
      if (result.success) {
        return `子任务${index + 1} (${task.description}):\n${result.output}`;
      } else {
        return `子任务${index + 1} (${task.description}): 执行失败 - ${result.error}`;
      }
    }).join('\n\n');

    const prompt = `用户原始请求: ${query}

以下是多个子任务的结果，请汇总成最终回答:

${resultsText}

要求:
1. 合并相关结果，保持逻辑连贯
2. 如果有失败的任务，在最终回答中说明
3. 返回最终回答，不要解释过程`;

    try {
      const response = await this.llm.chat([
        { role: 'user', content: prompt }
      ]);
      return response;
    } catch (e) {
      return results
        .filter(r => r.success)
        .map(r => r.output)
        .join('\n\n');
    }
  }

  /**
   * 统计执行结果
   */
  summarizeResults(results: ExecutionResult[]): {
    total: number;
    success: number;
    failed: number;
    totalLatencyMs: number;
    byModel: Record<string, number>;
  } {
    const byModel: Record<string, number> = {};
    let totalLatency = 0;

    for (const result of results) {
      byModel[result.modelUsed] = (byModel[result.modelUsed] || 0) + 1;
      totalLatency += result.latencyMs;
    }

    return {
      total: results.length,
      success: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      totalLatencyMs: totalLatency,
      byModel,
    };
  }
}
