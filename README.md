# sked — Local Repo Intelligence

A web-based application that runs entirely on the user's device, utilizing multi-model AI (Qwen2.5 and uncensored fallbacks) plus layered reasoning to analyze Git repositories locally.

## Features

- 🔒 **100% Local Processing**: All analysis happens on your device - no data leaves your browser
- 🤖 **AI-Powered Analysis**: Uses Qwen2.5-0.5B-Instruct with uncensored fallbacks (Qwen2.5 uncensored Q8_0, Llama2 XS uncensored) for thorough security/code insights
- 📁 **Git Repository Support**: Upload and analyze entire Git repositories
- 🔍 **Security Analysis**: Identify vulnerabilities, exploits, and security issues
- 💬 **Interactive Q&A**: Ask questions about code functionality, architecture, and best practices
- 🎨 **Modern UI**: Beautiful, responsive interface built with TypeScript

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Modern web browser with WebAssembly support

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser to `http://localhost:3000`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Usage

1. **Upload Repository**: Click the upload area or drag and drop a directory containing your Git repository
2. **Wait for Processing**: The app will process all files in the repository
3. **Ask Questions**: Use the chat interface to ask questions about:
   - Code functionality and architecture
   - Security vulnerabilities
   - Potential exploits
   - Code quality and best practices
   - Dependencies and risks

## How It Works

- **Model Loading**: The Qwen2.5-0.5B-Instruct model is loaded using `@mlc-ai/web-llm`, which compiles the model to WebAssembly for browser execution
- **Repository Processing**: Files are read and parsed to create a comprehensive context of the repository
- **Analysis**: The model analyzes the repository context and answers your questions locally

## Technical Details

- **Frontend**: TypeScript, Vite
- **AI Models**: Qwen2.5-0.5B-Instruct-GGUF (primary) plus uncensored fallbacks via @mlc-ai/web-llm
- **File Processing**: Browser File API for reading repository files
- **All processing happens client-side** - no server required

## Limitations

- Model size: ~500MB (downloads on first use)
- Processing large repositories may take time
- Browser memory limits may affect very large repositories
- Model inference speed depends on your device's capabilities
- Requires a modern browser with WebAssembly and WebGPU support (Chrome, Edge, or Firefox with WebGPU enabled)
- The model will be downloaded from MLC-LLM's CDN on first use

## Model Loading

The application uses `@mlc-ai/web-llm` to load the Qwen2.5-0.5B-Instruct model. The model identifier may need to be adjusted based on what's available in the MLC-LLM model registry. If you encounter model loading errors, check the browser console for details and verify that the model identifier matches what's available in the MLC-LLM ecosystem.

## Troubleshooting

### Model won't load
- Check browser console for specific error messages
- Ensure your browser supports WebAssembly and WebGPU
- Try a different browser (Chrome/Edge recommended)
- Check network connectivity (model downloads on first use)

### Repository processing fails
- Ensure you're selecting a directory (not individual files)
- Check that files are readable (not binary or corrupted)
- Very large repositories may take time to process

### Slow performance
- Model inference speed depends on your device
- Large repositories create larger context windows, which take longer to process
- Consider analyzing smaller portions of the repository

## License

This project is open source. The Qwen2.5 model is licensed under Apache 2.0.

