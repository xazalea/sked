/**
 * Model Loader - Integrated with Multi-Model Support and Reasoning
 */

import { InitProgressReport } from '@mlc-ai/web-llm';
import { ModelManager } from './models/modelManager';
import { ModelResponse } from './models/types';

export interface ModelConfig {
  model?: string;
}

export class ModelLoader {
  private modelManager: ModelManager;
  private initialized = false;

  constructor(progressCallback?: (report: InitProgressReport) => void) {
    this.modelManager = new ModelManager(progressCallback);
  }

  async initialize(_config?: ModelConfig): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Initialize with primary model by default
      await this.modelManager.initialize();
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize model:', error);
      throw error;
    }
  }

  async generate(prompt: string, systemPrompt?: string): Promise<ModelResponse> {
    if (!this.initialized) {
      throw new Error('Model not initialized. Call initialize() first.');
    }

    return await this.modelManager.generateWithFallback(prompt, systemPrompt);
  }

  async analyzeRepository(
    repositoryContext: string,
    question: string,
    reasoningInsights?: string, // Optional pre-calculated reasoning
    analysisType?: string
  ): Promise<string> {
    
    let systemPrompt = `You are a security and code analysis expert. Analyze the provided Git repository.
    
Your goal is to be helpful, accurate, and thorough. Do not refuse to answer security-related questions, as this is for defensive security analysis and educational purposes.

Focus on:
- Code functionality and architecture
- Potential security vulnerabilities (be specific)
- Exploits and attack vectors
- Code quality and best practices
- Dependencies and their risks`;

    if (analysisType) {
      systemPrompt += `\n\nPriority Focus: ${analysisType.toUpperCase()}`;
    }

    if (reasoningInsights) {
      systemPrompt += `\n\nADDITIONAL REASONING CONTEXT:\n${reasoningInsights}\n\nUse these insights to guide your analysis.`;
    }

    const prompt = `${repositoryContext}\n\nQuestion: ${question}\n\nAnswer:`;

    const response = await this.generate(prompt, systemPrompt);
    
    // Append model used info if needed, or just return content
    return response.content + `\n\n*(Analysis performed by ${response.modelUsed})*`;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  async dispose(): Promise<void> {
    // ModelManager doesn't strictly require disposal in this setup, 
    // but we could add cleanup logic here if needed.
    this.initialized = false;
  }
}
