/**
 * OpenClaw 模型适配器 - 让智能路由可以调用OpenClaw的模型
 */
import type { LLM } from "../../agents/model-selection.js";

/**
 * OpenClaw LLM 适配器
 * 包装OpenClaw的模型调用，使其符合Smart Router的接口
 */
export class OpenClawLLMAdapter implements LLM {
  private executeFn: (messages: Array<{ role: string; content: string }>) => Promise<string>;

  constructor(
    executeFn: (messages: Array<{ role: string; content: string }>) => Promise<string>
  ) {
    this.executeFn = executeFn;
  }

  async chat(messages: Array<{ role: string; content: string }>): Promise<string> {
    return this.executeFn(messages);
  }
}

/**
 * 从OpenClaw Agent创建适配器
 */
export function createLLMAdapter(
  agentExecute: (prompt: string) => Promise<string>
): LLM {
  return new OpenClawLLMAdapter(async (messages) => {
    // 将消息数组合并成单个prompt
    const prompt = messages.map(m => `${m.role}: ${m.content}`).join('\n');
    return agentExecute(prompt);
  });
}

/**
 * 创建模型注册表
 */
export function createModelRegistry(
  models: Array<{ provider: string; model: string; executeFn: (messages: any[]) => Promise<string> }>
): Map<string, LLM> {
  const registry = new Map<string, LLM>();
  
  for (const m of models) {
    const key = `${m.provider}/${m.model}`;
    registry.set(key, new OpenClawLLMAdapter(m.executeFn));
  }

  return registry;
}
