import { ModelLoader } from '../lib/modelLoader';
import { GitRepositoryParser, RepositoryData } from '../lib/gitParser';
import { ReasoningOrchestrator } from '../lib/reasoning/orchestrator';
import { CombinedReasoning } from '../lib/reasoning/types';

export class App {
  private container: HTMLElement;
  private modelLoader: ModelLoader;
  private gitParser: GitRepositoryParser;
  private reasoningOrchestrator: ReasoningOrchestrator;
  private repositoryData: RepositoryData | null = null;
  private chatMessages: HTMLElement;
  private chatInput: HTMLTextAreaElement;
  private sendButton: HTMLButtonElement;
  private uploadArea: HTMLElement;
  private statusDiv: HTMLElement;
  private repoInfoDiv: HTMLElement;
  private reasoningSummaryEl: HTMLElement;
  private securityListEl: HTMLElement;
  private architectureListEl: HTMLElement;
  private qualityListEl: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.modelLoader = new ModelLoader();
    this.gitParser = new GitRepositoryParser();
    this.reasoningOrchestrator = new ReasoningOrchestrator();
    this.render();
    this.initializeModel();
  }

  private render(): void {
    // Generate matrix background
    const matrixChars = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
    const matrixHTML = Array.from({ length: 200 }, () => 
      `<span>${matrixChars[Math.floor(Math.random() * matrixChars.length)]}</span>`
    ).join('');

    this.container.innerHTML = `
      <div class="jp-matrix">${matrixHTML}</div>
      <div class="app-container">
        <div class="header">
          <h1>🔍 Git Repository Analyzer</h1>
          <p>Local AI-powered code analysis using Qwen2.5-0.5B-Instruct</p>
          <div style="margin-top: 20px; display: flex; align-items: center; justify-content: center; gap: 20px;">
            <label class="torch-container" style="color: white; font-size: 0.9rem;">
              <input type="checkbox" id="model-toggle" checked>
              <span style="margin-bottom: 10px; display: block;">Model Enabled</span>
              <div class="torch">
                <div class="head">
                  <div class="face top">
                    <div></div><div></div><div></div><div></div>
                  </div>
                  <div class="face left">
                    <div></div><div></div><div></div><div></div>
                  </div>
                  <div class="face right">
                    <div></div><div></div><div></div><div></div>
                  </div>
                </div>
                <div class="stick">
                  <div class="side side-left">
                    ${Array.from({ length: 16 }, () => '<div></div>').join('')}
                  </div>
                  <div class="side side-right">
                    ${Array.from({ length: 16 }, () => '<div></div>').join('')}
                  </div>
                </div>
              </div>
            </label>
          </div>
        </div>

        <div class="main-content">
          <div class="card">
            <h2>📁 Repository Upload</h2>
            <div class="upload-section">
              <div class="upload-area" id="upload-area">
                <div class="upload-icon">📂</div>
                <p><strong>Click to select a directory</strong> or drag and drop</p>
                <p style="margin-top: 10px; font-size: 0.9rem; color: #666;">
                  Select the root directory of your Git repository
                </p>
                <input type="file" id="file-input" webkitdirectory multiple style="display: none;">
              </div>
              <div id="status"></div>
              <div id="loader-container" style="display: none; margin: 20px 0; text-align: center;">
                <div class="loader">
                  <div class="truckWrapper">
                    <div class="truckBody" style="font-size: 60px;">🚚</div>
                    <div class="truckTires">
                      <svg width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#333"/></svg>
                      <svg width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#333"/></svg>
                    </div>
                    <div class="road"></div>
                  </div>
                </div>
                <p style="margin-top: 10px; color: #666;">Processing files...</p>
              </div>
              <div id="repo-info" style="display: none; margin-top: 16px;">
                <div class="card-3d">
                  <div class="card-3d-tracker"></div>
                  <div class="card-3d-content">
                    <div class="card-content">
                      <div class="card-3d-prompt">Hover for details</div>
                      <div class="card-3d-title" id="repo-title">Repository</div>
                      <div class="card-3d-subtitle" id="repo-subtitle">Loaded</div>
                    </div>
                  </div>
                </div>
                <div id="file-tree-container" class="file-tree-container">
                  <h4 style="margin-bottom: 8px; color: #667eea; font-size: 0.9rem;">📁 File Tree:</h4>
                  <div id="file-tree"></div>
                </div>
              </div>
            </div>
          </div>

          <div class="card">
            <h2>💬 Ask Questions</h2>
            <div style="margin-bottom: 12px;">
              <label style="font-size: 0.9rem; color: #666; margin-bottom: 8px; display: block;">Analysis Type:</label>
              <div class="radio-container">
                <div class="radio-wrapper">
                  <input type="radio" name="analysis-type" id="type-security" class="input" value="security" checked>
                  <div class="radio-btn">Security</div>
                </div>
                <div class="radio-wrapper">
                  <input type="radio" name="analysis-type" id="type-code" class="input" value="code">
                  <div class="radio-btn">Code</div>
                </div>
                <div class="radio-wrapper">
                  <input type="radio" name="analysis-type" id="type-arch" class="input" value="architecture">
                  <div class="radio-btn">Arch</div>
                </div>
              </div>
            </div>
            <div id="quick-actions" style="display: none; margin-bottom: 12px; padding: 12px; background: #f8f9ff; border-radius: 8px;">
              <label style="font-size: 0.9rem; color: #666; margin-bottom: 8px; display: block;">Quick Actions:</label>
              <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                <button class="quick-action-btn" data-question="Find all security vulnerabilities and potential exploits in this codebase. Include file paths, line numbers, and exploit vectors.">🔍 Find Exploits</button>
                <button class="quick-action-btn" data-question="Explain what this codebase does. What is its main purpose and functionality?">📖 What Does This Do?</button>
                <button class="quick-action-btn" data-question="Analyze the architecture and design patterns used. How is the code organized?">🏗️ Architecture Overview</button>
                <button class="quick-action-btn" data-question="Find all hardcoded secrets, API keys, passwords, or sensitive data.">🔑 Find Secrets</button>
                <button class="quick-action-btn" data-question="Identify all SQL injection, XSS, CSRF, and other injection vulnerabilities.">💉 Injection Vulnerabilities</button>
                <button class="quick-action-btn" data-question="What are the main entry points and attack surfaces in this application?">🎯 Attack Surfaces</button>
                <button class="quick-action-btn" data-question="Explain the authentication and authorization mechanisms. Are there any flaws?">🔐 Auth Analysis</button>
                <button class="quick-action-btn" data-question="What dependencies are used and what are their security implications?">📦 Dependencies</button>
              </div>
            </div>
            <div id="reasoning-panel" class="reasoning-panel">
              <div id="reasoning-summary" class="status info">Reasoning insights will appear here after you ask a question.</div>
              <div class="reasoning-lists">
                <div>
                  <h4>Security</h4>
                  <ul id="security-insights" class="insight-list"></ul>
                </div>
                <div>
                  <h4>Architecture</h4>
                  <ul id="architecture-insights" class="insight-list"></ul>
                </div>
                <div>
                  <h4>Code Quality</h4>
                  <ul id="quality-insights" class="insight-list"></ul>
                </div>
              </div>
            </div>
            <div class="chat-container">
              <div class="chat-messages" id="chat-messages">
                <div class="message assistant">
                  <div class="message-header">Assistant</div>
                  <div class="message-content">
                    👋 Hello! Upload a Git repository to get started. I can help you analyze:
                    <ul style="margin-top: 8px; padding-left: 20px;">
                      <li>Code functionality and architecture</li>
                      <li>Security vulnerabilities</li>
                      <li>Potential exploits</li>
                      <li>Code quality and best practices</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div class="chat-input-container">
                <div class="input-container">
                  <textarea 
                    id="chat-input" 
                    class="input" 
                    placeholder="Ask a question about the repository..."
                    rows="2"
                    disabled
                  ></textarea>
                  <label class="label">Question</label>
                  <span class="topline"></span>
                  <span class="underline"></span>
                </div>
                <button id="send-button" class="button type1" disabled></button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.uploadArea = this.container.querySelector('#upload-area')!;
    this.statusDiv = this.container.querySelector('#status')!;
    this.repoInfoDiv = this.container.querySelector('#repo-info')!;
    this.chatMessages = this.container.querySelector('#chat-messages')!;
    this.chatInput = this.container.querySelector('#chat-input') as HTMLTextAreaElement;
    this.sendButton = this.container.querySelector('#send-button') as HTMLButtonElement;
    this.reasoningSummaryEl = this.container.querySelector('#reasoning-summary') as HTMLElement;
    this.securityListEl = this.container.querySelector('#security-insights') as HTMLElement;
    this.architectureListEl = this.container.querySelector('#architecture-insights') as HTMLElement;
    this.qualityListEl = this.container.querySelector('#quality-insights') as HTMLElement;

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    const fileInput = this.container.querySelector('#file-input') as HTMLInputElement;

    // Click to select directory
    this.uploadArea.addEventListener('click', () => {
      fileInput.click();
    });

    // Drag and drop
    this.uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.uploadArea.classList.add('dragover');
    });

    this.uploadArea.addEventListener('dragleave', () => {
      this.uploadArea.classList.remove('dragover');
    });

    this.uploadArea.addEventListener('drop', async (e) => {
      e.preventDefault();
      this.uploadArea.classList.remove('dragover');
      const files = Array.from(e.dataTransfer?.files || []);
      if (files.length > 0) {
        await this.processFiles(files);
      }
    });

    // File input change
    fileInput.addEventListener('change', async (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      if (files.length > 0) {
        await this.processFiles(files);
      }
    });

    // Chat input
    this.chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    this.sendButton.addEventListener('click', () => {
      this.sendMessage();
    });

    // Model toggle
    const modelToggle = this.container.querySelector('#model-toggle') as HTMLInputElement;
    if (modelToggle) {
      modelToggle.addEventListener('change', (e) => {
        const enabled = (e.target as HTMLInputElement).checked;
        if (!enabled) {
          this.showStatus('Model disabled. Enable it to use AI analysis.', 'warning');
        } else {
          this.showStatus('Model enabled. Ready for analysis.', 'success');
        }
      });
    }

    // Quick action buttons
    const quickActionBtns = this.container.querySelectorAll('.quick-action-btn');
    quickActionBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const question = (btn as HTMLElement).dataset.question || '';
        if (question && this.repositoryData) {
          this.chatInput.value = question;
          this.chatInput.focus();
          // Auto-send
          setTimeout(() => {
            this.sendMessage();
          }, 100);
        }
      });
    });
  }

  private async processFiles(files: File[]): Promise<void> {
    this.showStatus('Processing repository files...', 'info');
    this.showLoader(true);

    try {
      // Create a virtual file system from the uploaded files
      const fileMap = new Map<string, File>();
      
      for (const file of files) {
        // Remove leading path separators and normalize
        const path = file.webkitRelativePath || file.name;
        fileMap.set(path, file);
      }

      const totalEntries = Array.from(fileMap.entries()).filter(([path]) => !path.includes('.git/')).length;
      // Convert File objects to RepositoryFile format
      const repositoryFiles: any[] = [];
      let totalSize = 0;
      let processedCount = 0;

      for (const [path, file] of fileMap.entries()) {
        if (path.includes('.git/')) continue; // Skip .git directory
        
        try {
          const { content } = await this.readFileContentStrict(file);
          repositoryFiles.push({
            path,
            content,
            size: content.length,
            type: 'file'
          });
          totalSize += content.length;
          processedCount++;

          if (processedCount % 10 === 0 || processedCount === totalEntries) {
            const progressPercent = Math.round((processedCount / totalEntries) * 100);
            this.showStatus(`Processing files... ${processedCount}/${totalEntries} (${progressPercent}%) - ${(totalSize / 1024).toFixed(2)} KB loaded`, 'info');
          }
        } catch (err) {
          console.warn(`Skipping file ${path}:`, err);
        }
      }

      // Build structure
      const structure = this.buildStructure(repositoryFiles);

      this.repositoryData = {
        files: repositoryFiles,
        commits: [],
        structure,
        totalFiles: repositoryFiles.length,
        totalSize
      };

      this.showStatus(`Repository loaded: ${repositoryFiles.length} files`, 'success');
      this.showLoader(false);
      this.showRepositoryInfo();
      this.chatInput.disabled = false;
      this.sendButton.disabled = false;
      this.updateReasoningUI(null);

      // Show quick actions
      const quickActions = this.container.querySelector('#quick-actions') as HTMLElement;
      if (quickActions) {
        quickActions.style.display = 'block';
      }
    } catch (error) {
      console.error('Error processing repository:', error);
      this.showLoader(false);
      this.showStatus(`Error: ${error instanceof Error ? error.message : 'Failed to process repository'}`, 'error');
    }
  }

  private async readFileContentStrict(file: File): Promise<{ content: string; isBinary: boolean }> {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    const binaryScore = this.computeBinaryScore(bytes);
    const isBinary = binaryScore > 0.15;

    if (isBinary) {
      // Represent binary as base64 to preserve data without choking the LLM with raw bytes
      const base64 = this.toBase64(bytes);
      return { content: `[BINARY FILE - base64]\n${base64}`, isBinary: true };
    }

    const decoder = new TextDecoder('utf-8', { fatal: false });
    const text = decoder.decode(bytes);
    return { content: text, isBinary: false };
  }

  private computeBinaryScore(bytes: Uint8Array): number {
    const sampleLen = Math.min(bytes.length, 4096);
    let nonPrintable = 0;
    for (let i = 0; i < sampleLen; i++) {
      const code = bytes[i];
      const isPrintable = (code >= 32 && code <= 126) || code === 9 || code === 10 || code === 13;
      if (!isPrintable) nonPrintable++;
    }
    return sampleLen === 0 ? 0 : nonPrintable / sampleLen;
  }

  private toBase64(bytes: Uint8Array): string {
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode(...chunk);
    }
    return btoa(binary);
  }

  private buildStructure(files: any[]): string {
    const tree: Record<string, any> = {};
    
    for (const file of files) {
      const parts = file.path.split('/').filter((p: string) => p);
      let current = tree;
      
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (i === parts.length - 1) {
          current[part] = 'FILE';
        } else {
          if (!current[part]) {
            current[part] = {};
          }
          current = current[part];
        }
      }
    }
    
    const formatTree = (obj: any, indent = 0): string => {
      let result = '';
      const spaces = '  '.repeat(indent);
      
      for (const [key, value] of Object.entries(obj)) {
        if (value === 'FILE') {
          result += `${spaces}${key}\n`;
        } else {
          result += `${spaces}${key}/\n`;
          result += formatTree(value, indent + 1);
        }
      }
      
      return result;
    };
    
    return formatTree(tree);
  }

  private showStatus(message: string, type: 'info' | 'success' | 'error' | 'warning'): void {
    this.statusDiv.innerHTML = `<div class="status ${type}">${message}</div>`;
  }

  private showLoader(show: boolean): void {
    const loaderContainer = this.container.querySelector('#loader-container') as HTMLElement;
    if (loaderContainer) {
      loaderContainer.style.display = show ? 'block' : 'none';
    }
  }

  private showRepositoryInfo(): void {
    if (!this.repositoryData) return;

    this.repoInfoDiv.style.display = 'block';
    const titleEl = this.repoInfoDiv.querySelector('#repo-title') as HTMLElement;
    const subtitleEl = this.repoInfoDiv.querySelector('#repo-subtitle') as HTMLElement;
    const fileTreeContainer = this.repoInfoDiv.querySelector('#file-tree-container') as HTMLElement;
    const fileTree = this.repoInfoDiv.querySelector('#file-tree') as HTMLElement;
    
    if (titleEl) {
      titleEl.textContent = `${this.repositoryData.totalFiles} Files`;
    }
    if (subtitleEl) {
      subtitleEl.innerHTML = `${(this.repositoryData.totalSize / 1024).toFixed(2)} KB <span class="highlight">Analyzed</span>`;
    }

    // Show file tree
    if (fileTreeContainer && fileTree) {
      fileTreeContainer.style.display = 'block';
      const formattedTree = this.repositoryData.structure
        .split('\n')
        .slice(0, 50) // Limit display for performance
        .map(line => `<div class="file-tree-item">${line}</div>`)
        .join('');
      fileTree.innerHTML = formattedTree + (this.repositoryData.structure.split('\n').length > 50 ? '<div class="file-tree-item">... (truncated for display)</div>' : '');
    }
  }

  private updateReasoningUI(result: CombinedReasoning | null): void {
    if (!this.reasoningSummaryEl || !this.securityListEl || !this.architectureListEl || !this.qualityListEl) return;
    if (!result) {
      this.reasoningSummaryEl.textContent = 'Reasoning insights will appear here after you ask a question.';
      this.securityListEl.innerHTML = '';
      this.architectureListEl.innerHTML = '';
      this.qualityListEl.innerHTML = '';
      return;
    }

    this.reasoningSummaryEl.textContent = `${result.summary} (confidence ${(result.aggregatedConfidence * 100).toFixed(1)}%)`;

    const renderList = (el: HTMLElement, items: string[]) => {
      el.innerHTML = items.length
        ? items.map(item => `<li>${item}</li>`).join('')
        : '<li>No items reported.</li>';
    };

    renderList(this.securityListEl, result.securityConcerns);
    renderList(this.architectureListEl, result.architectureInsights);
    renderList(this.qualityListEl, result.codeQualityIssues || []);
  }

  private async sendMessage(): Promise<void> {
    const question = this.chatInput.value.trim();
    if (!question || !this.repositoryData) return;

    // Check if model is enabled
    const modelToggle = this.container.querySelector('#model-toggle') as HTMLInputElement;
    if (modelToggle && !modelToggle.checked) {
      this.addMessage('assistant', 'Please enable the model using the torch switch above to use AI analysis.');
      return;
    }

    // Get analysis type
    const analysisType = (this.container.querySelector('input[name="analysis-type"]:checked') as HTMLInputElement)?.value || 'security';

    // Add user message
    this.addMessage('user', question);
    this.chatInput.value = '';
    this.chatInput.disabled = true;
    this.sendButton.disabled = true;

    // Show loading with truck
    this.showLoader(true);
    const loadingId = this.addMessage('assistant', 'Analyzing repository...', true);

    try {
      // 1. Pre-processing & Reasoning (OpenReason + AdaReasoner)
      const reasoningResult = await this.reasoningOrchestrator.analyze(
        {
          files: this.repositoryData.files,
          structure: this.repositoryData.structure,
          totalFiles: this.repositoryData.totalFiles,
          totalSize: this.repositoryData.totalSize,
          metadata: {}
        },
        question
      );
      this.updateReasoningUI(reasoningResult);

      // Format repository context
      const context = this.gitParser.formatRepositoryContext(this.repositoryData);
      
      // Get response from model (with Multi-Model support)
      // Pass reasoning insights to model
      const response = await this.modelLoader.analyzeRepository(context, question, reasoningResult.summary, analysisType);
      
      // Update message
      this.updateMessage(loadingId, response);
      this.showLoader(false);
    } catch (error) {
      console.error('Error generating response:', error);
      this.updateMessage(loadingId, `Error: ${error instanceof Error ? error.message : 'Failed to generate response'}`);
      this.showLoader(false);
    } finally {
      this.chatInput.disabled = false;
      this.sendButton.disabled = false;
      this.chatInput.focus();
    }
  }

  private addMessage(role: 'user' | 'assistant', content: string, isLoading = false): string {
    const messageId = `msg-${Date.now()}-${Math.random()}`;
    const messageDiv = document.createElement('div');
    messageDiv.id = messageId;
    messageDiv.className = `message ${role}`;
    
    const header = document.createElement('div');
    header.className = 'message-header';
    header.textContent = role === 'user' ? 'You' : 'Assistant';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    if (isLoading) {
      contentDiv.innerHTML = '<span class="loading"></span> ' + content;
    } else {
      // Basic formatting for code blocks
      const formattedContent = content
        .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
        .replace(/`([^`]+)`/g, '<code>$1</code>');
      contentDiv.innerHTML = formattedContent;
    }
    
    // Auto-scroll
    setTimeout(() => {
      this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }, 100);
    
    messageDiv.appendChild(header);
    messageDiv.appendChild(contentDiv);
    this.chatMessages.appendChild(messageDiv);
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    
    return messageId;
  }

  private updateMessage(messageId: string, content: string): void {
    const messageDiv = document.getElementById(messageId);
    if (messageDiv) {
      const contentDiv = messageDiv.querySelector('.message-content');
      if (contentDiv) {
        // Basic formatting for code blocks
        const formattedContent = content
          .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
          .replace(/`([^`]+)`/g, '<code>$1</code>');
        contentDiv.innerHTML = formattedContent;
      }
    }
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
  }

  private async initializeModel(): Promise<void> {
    this.showStatus('Initializing AI model... This may take a moment.', 'info');
    
    try {
      await this.modelLoader.initialize();
      this.showStatus('Model ready! Upload a repository to begin analysis.', 'success');
    } catch (error) {
      console.error('Model initialization error:', error);
      this.showStatus(
        `Model initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}. Please refresh the page.`,
        'error'
      );
    }
  }
}
