export interface ModelDefinition {
  id: string;
  name: string;
  description: string;
  isUncensored: boolean;
  hfUrl: string;
  quantization?: string;
  modelLib?: string; // e.g. "qwen2", "llama-2"
  wasmUrl?: string; // Optional custom WASM url
}

export type ModelStatus = 'idle' | 'loading' | 'ready' | 'failed' | 'processing';

export interface ModelResponse {
  content: string;
  modelUsed: string;
  isRefusal: boolean;
}
