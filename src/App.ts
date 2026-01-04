import JSZip from 'jszip';
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
  private repoInput!: HTMLInputElement;
  private loadButton!: HTMLButtonElement;
  private chatMessages!: HTMLElement;
  private chatInput!: HTMLTextAreaElement;
  private sendButton!: HTMLButtonElement;
  private statusDiv!: HTMLElement;
  private reasoningSummaryEl!: HTMLElement;
  private securityListEl!: HTMLElement;
  private architectureListEl!: HTMLElement;
  private qualityListEl!: HTMLElement;
  private icons = {
    user: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z"/><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/></svg>',
    assistant: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M12 8v5"/><path d="M8 16v-4a4 4 0 0 1 8 0v4"/><path d="M9 20h6"/><path d="M8 20a2 2 0 1 0 4 0"/><path d="M12 20a2 2 0 1 0 4 0"/></svg>'
  };

  constructor(container: HTMLElement) {
    this.container = container;
    this.modelLoader = new ModelLoader();
    this.gitParser = new GitRepositoryParser();
    this.reasoningOrchestrator = new ReasoningOrchestrator();
    this.render();
    this.initializeModel();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="app-container">
        <div class="header">
          <h1>sked — Local Repo Intelligence</h1>
          <p>All-client analysis with multi-model AI and deep reasoning</p>
        </div>

        <div class="main">
          <div class="panel">
            <h2>Repository</h2>
            <div class="input-row">
              <input id="repo-url" class="text-input" placeholder="https://github.com/org/repo" />
              <button id="load-btn" class="button">Fetch</button>
            </div>
            <div id="status" class="status info">Enter a Git URL to analyze.</div>
            <div id="file-tree" class="file-tree" style="display:none;"></div>
          </div>

          <div class="panel">
            <h2>Ask sked</h2>
            <div class="chat">
              <div class="messages" id="chat-messages">
                <div class="message assistant">
                  <div class="message-header"><span>Assistant</span></div>
                  <div class="message-content">
                    Welcome to sked. Fetch a repo to start a full local analysis. I can help with architecture, security, exploits, and code quality.
                  </div>
                </div>
              </div>
              <div class="input-area">
                <textarea 
                  id="chat-input" 
                  class="textarea" 
                  placeholder="Ask a question about the repository..."
                  rows="2"
                  disabled
                ></textarea>
                <button id="send-button" class="button" disabled>Send</button>
              </div>
            </div>
            <div class="reasoning">
              <h4>Reasoning</h4>
              <div id="reasoning-summary" class="status info">Reasoning insights will appear here after you ask a question.</div>
              <div class="insights">
                <ul id="security-insights"></ul>
                <ul id="architecture-insights"></ul>
                <ul id="quality-insights"></ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.repoInput = this.container.querySelector('#repo-url') as HTMLInputElement;
    this.loadButton = this.container.querySelector('#load-btn') as HTMLButtonElement;
    this.statusDiv = this.container.querySelector('#status') as HTMLElement;
    this.chatMessages = this.container.querySelector('#chat-messages') as HTMLElement;
    this.chatInput = this.container.querySelector('#chat-input') as HTMLTextAreaElement;
    this.sendButton = this.container.querySelector('#send-button') as HTMLButtonElement;
    this.reasoningSummaryEl = this.container.querySelector('#reasoning-summary') as HTMLElement;
    this.securityListEl = this.container.querySelector('#security-insights') as HTMLElement;
    this.architectureListEl = this.container.querySelector('#architecture-insights') as HTMLElement;
    this.qualityListEl = this.container.querySelector('#quality-insights') as HTMLElement;

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.loadButton.addEventListener('click', () => this.handleFetch());
    this.repoInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.handleFetch();
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
  }

  private async handleFetch(): Promise<void> {
    const url = this.repoInput.value.trim();
    if (!url) {
      this.showStatus('Enter a Git URL to analyze.', 'error');
      return;
    }
    this.showStatus('Fetching repository...', 'info');
    this.updateReasoningUI(null);
    this.chatInput.disabled = true;
    this.sendButton.disabled = true;

    try {
      const data = await this.fetchRepositoryFromUrl(url);
      this.repositoryData = data;
      this.updateFileTree();
      this.showStatus(`Repository loaded: ${data.totalFiles} files | ${(data.totalSize / 1024).toFixed(2)} KB`, 'success');
      this.chatInput.disabled = false;
      this.sendButton.disabled = false;
    } catch (error) {
      console.error('Fetch error:', error);
      this.showStatus(`Error: ${error instanceof Error ? error.message : 'Failed to fetch repository'}`, 'error');
    }
  }

  private async fetchRepositoryFromUrl(repoUrl: string): Promise<RepositoryData> {
    const candidates = this.buildZipUrls(repoUrl);
    let resp: Response | null = null;
    for (const candidate of candidates) {
      try {
        const r = await fetch(candidate);
        if (r.ok) {
          resp = r;
          break;
        }
      } catch {
        // try next
      }
    }
    if (!resp) throw new Error('Could not fetch repository zip (tried main/master).');

    const blob = await resp.blob();
    const zip = await JSZip.loadAsync(blob);

    const repositoryFiles: any[] = [];
    let totalSize = 0;
    const entries = Object.values(zip.files);
    for (const entry of entries) {
      if (entry.dir) continue;
      const normalized = this.normalizeZipPath(entry.name);
      if (!normalized || normalized.includes('/.git/')) continue;

      const bytes = await entry.async('uint8array');
      const { content } = this.decodeBytes(bytes);
      repositoryFiles.push({
        path: normalized,
        content,
        size: content.length,
        type: 'file'
      });
      totalSize += content.length;
    }

    const structure = this.buildStructure(repositoryFiles);
    return {
      files: repositoryFiles,
      commits: [],
      structure,
      totalFiles: repositoryFiles.length,
      totalSize
    };
  }

  private buildZipUrls(repoUrl: string): string[] {
    const cleaned = repoUrl.replace(/\.git$/, '');
    const parts = cleaned.split('/');
    const owner = parts[3];
    const repo = parts[4];
    let branch = 'main';
    if (parts[5] === 'tree' && parts[6]) {
      branch = parts[6];
    }
    const base = `https://codeload.github.com/${owner}/${repo}/zip/refs/heads`;
    return [`${base}/${branch}`, `${base}/main`, `${base}/master`];
  }

  private normalizeZipPath(path: string): string {
    // Remove leading top-level folder from GitHub zip (repo-branch/)
    const segments = path.split('/');
    if (segments.length <= 1) return '';
    segments.shift();
    return segments.join('/');
  }

  private decodeBytes(bytes: Uint8Array): { content: string; isBinary: boolean } {
    const binaryScore = this.computeBinaryScore(bytes);
    const isBinary = binaryScore > 0.15;
    if (isBinary) {
      const base64 = this.toBase64(bytes);
      return { content: `[BINARY FILE - base64]\n${base64}`, isBinary: true };
    }
    const decoder = new TextDecoder('utf-8', { fatal: false });
    return { content: decoder.decode(bytes), isBinary: false };
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

  private updateFileTree(): void {
    if (!this.repositoryData) return;
    const fileTree = this.container.querySelector('#file-tree') as HTMLElement;
    if (!fileTree) return;
    fileTree.style.display = 'block';
    const formattedTree = this.repositoryData.structure
      .split('\n')
      .filter(Boolean)
      .slice(0, 120)
      .map(line => `<div>${line}</div>`)
      .join('');
    const more = this.repositoryData.structure.split('\n').length > 120 ? '<div>... (truncated for display)</div>' : '';
    fileTree.innerHTML = formattedTree + more;
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

    // Add user message
    this.addMessage('user', question);
    this.chatInput.value = '';
    this.chatInput.disabled = true;
    this.sendButton.disabled = true;

    const loadingId = this.addMessage('assistant', 'Analyzing repository...', true);
    this.showStatus('Analyzing...', 'info');

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
      const response = await this.modelLoader.analyzeRepository(context, question, reasoningResult.summary, 'general');
      
      // Update message
      this.updateMessage(loadingId, response);
      this.showStatus('Ready.', 'success');
    } catch (error) {
      console.error('Error generating response:', error);
      this.updateMessage(loadingId, `Error: ${error instanceof Error ? error.message : 'Failed to generate response'}`);
      this.showStatus('Error during analysis.', 'error');
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
    header.innerHTML = `${role === 'user' ? this.icons.user : this.icons.assistant} ${role === 'user' ? 'You' : 'Assistant'}`;
    
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
      this.showStatus('sked ready. Upload a repository to begin analysis.', 'success');
    } catch (error) {
      console.error('Model initialization error:', error);
      this.showStatus(
        `Model initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}. Please refresh the page.`,
        'error'
      );
    }
  }
}
