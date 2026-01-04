import { CreateMLCEngine, MLCEngineInterface, InitProgressReport } from '@mlc-ai/web-llm';
import { ModelDefinition, ModelResponse } from './types';
import { RefusalDetector } from './refusalDetector';

// Define available models
export const MODELS: Record<string, ModelDefinition> = {
  PRIMARY: {
    id: 'Qwen2.5-0.5B-Instruct',
    name: 'Qwen 2.5 0.5B Instruct',
    description: 'Primary instruction-tuned model',
    isUncensored: false,
    hfUrl: 'https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF',
    modelLib: 'qwen2'
  },
  FALLBACK_1: {
    id: 'Triangle104/qwen2.5-.5b-uncensored-Q8_0-GGUF',
    name: 'Qwen 2.5 0.5B Uncensored (Q8)',
    description: 'Uncensored fallback model',
    isUncensored: true,
    hfUrl: 'https://huggingface.co/Triangle104/qwen2.5-.5b-uncensored-Q8_0-GGUF',
    quantization: 'q8_0',
    modelLib: 'qwen2'
  },
  FALLBACK_2: {
    id: 'afrideva/llama2_xs_460M_uncensored-GGUF',
    name: 'Llama2 XS 460M Uncensored',
    description: 'Secondary uncensored fallback',
    isUncensored: true,
    hfUrl: 'https://huggingface.co/afrideva/llama2_xs_460M_uncensored-GGUF',
    quantization: 'q8_0',
    modelLib: 'llama-2'
  }
};

export class ModelManager {
  private currentEngine: MLCEngineInterface | null = null;
  private currentModelId: string | null = null;
  private refusalDetector: RefusalDetector;
  private progressCallback?: (report: InitProgressReport) => void;

  constructor(progressCallback?: (report: InitProgressReport) => void) {
    this.refusalDetector = new RefusalDetector();
    this.progressCallback = progressCallback;
  }

  private getAppConfig(modelId: string): any {
    const modelDef = Object.values(MODELS).find(m => m.id === modelId);
    if (!modelDef) {
      return { model_list: [] };
    }

    // Use a permissive any-typed config to satisfy TS while passing through to MLC.
    const baseWasm = modelDef.modelLib === 'qwen2'
      ? 'https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/qwen2.5-0.5b-instruct-q4f16_1-ctx4k_cs1k-webgpu.wasm'
      : 'https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/llama-2-7b-chat-hf-q4f32_1-webgpu.wasm';

    // Explicit GGUF URLs per model to avoid undefined model_url
    const primaryModelUrl = 'https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4f16_1-ctx4k.gguf';
    const fallbackQwenUrl = 'https://huggingface.co/Triangle104/qwen2.5-.5b-uncensored-Q8_0-GGUF/resolve/main/qwen2.5-.5b-uncensored-q8_0.gguf';
    const fallbackLlamaUrl = 'https://huggingface.co/afrideva/llama2_xs_460M_uncensored-GGUF/resolve/main/llama2_xs_460m_uncensored.q8_0.gguf';

    let modelUrl = primaryModelUrl;
    if (modelDef.id === MODELS.FALLBACK_1.id) modelUrl = fallbackQwenUrl;
    if (modelDef.id === MODELS.FALLBACK_2.id) modelUrl = fallbackLlamaUrl;

    return {
      model_list: [
        {
          model: modelUrl,
          model_url: modelUrl,
          model_id: modelDef.id,
          model_lib: baseWasm,
          model_lib_url: baseWasm,
          vram_required_MB: 1024,
          required_features: ['shader-f16'],
          model_format: 'gguf'
        }
      ]
    } as any;
  }

  async initialize(
    modelId: string = MODELS.PRIMARY.id,
    progressCallback?: (report: InitProgressReport) => void
  ): Promise<void> {
    if (this.currentEngine && this.currentModelId === modelId) {
      return;
    }

    // Unload existing model if any
    if (this.currentEngine) {
      // await this.currentEngine.unload(); // If supported by API
      this.currentEngine = null;
    }

    console.log(`Initializing model: ${modelId}`);
    
    try {
      const appConfig = this.getAppConfig(modelId);
      
      this.currentEngine = await CreateMLCEngine(
        modelId,
        {
          appConfig: appConfig as any,
          initProgressCallback: (report) => {
            if (progressCallback) {
              progressCallback(report);
            }
            if (this.progressCallback) {
              this.progressCallback(report);
            }
          }
        }
      );
      this.currentModelId = modelId;
    } catch (error) {
      console.error(`Failed to load model ${modelId}:`, error);
      throw error;
    }
  }

  async generateWithFallback(prompt: string, systemPrompt?: string): Promise<ModelResponse> {
    const models = [MODELS.PRIMARY, MODELS.FALLBACK_1, MODELS.FALLBACK_2];
    
    for (const modelDef of models) {
      try {
        // Initialize if needed (lazy loading)
        if (this.currentModelId !== modelDef.id) {
          await this.initialize(modelDef.id);
        }

        if (!this.currentEngine) throw new Error("Engine not initialized");

        const messages = [
          { role: 'system', content: systemPrompt || 'You are a helpful assistant.' },
          { role: 'user', content: prompt }
        ];

        const response = await this.currentEngine.chat.completions.create({
          messages: messages as any,
          temperature: 0.7,
          max_tokens: 8192, // Large cap to avoid artificial truncation
          stream: false // Using non-streaming for simplicity in fallback logic
        });

        const content = response.choices[0]?.message?.content || "";
        
        // Check for refusal
        if (this.refusalDetector.isRefusal(content)) {
          console.warn(`Model ${modelDef.id} refused response. Trying fallback...`);
          continue; // Try next model
        }
        if (!this.refusalDetector.isQualityResponse(content)) {
          console.warn(`Model ${modelDef.id} produced low-quality response. Trying fallback...`);
          continue;
        }

        return {
          content,
          modelUsed: modelDef.name,
          isRefusal: false
        };

      } catch (error) {
        console.error(`Error with model ${modelDef.id}:`, error);
        continue; // Try next model on error
      }
    }

    throw new Error("All models failed or refused to answer.");
  }
}
