/**
 * Application configuration
 */

export const CONFIG = {
  // Model configuration
  MODEL: {
    TEMPERATURE: 0.7,
    // Preferred order for fallback
    ORDER: [
      'Qwen/Qwen2.5-0.5B-Instruct-GGUF',
      'Triangle104/qwen2.5-.5b-uncensored-Q8_0-GGUF',
      'afrideva/llama2_xs_460M_uncensored-GGUF'
    ]
  },
  
  // File processing
  FILE_PROCESSING: {
    // Explicitly no limits; full content is always read
    MAX_FILE_SIZE: undefined,
    TRUNCATE_LARGE_FILES: false,
    TRUNCATE_SIZE: undefined
  },
  
  // UI
  UI: {
    CHAT_MAX_HEIGHT: 600,
    DEBOUNCE_DELAY: 300
  }
};
