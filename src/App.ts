import JSZip from 'jszip';
import { ModelLoader } from '../lib/modelLoader';
import { GitRepositoryParser, RepositoryData } from '../lib/gitParser';
import { ReasoningOrchestrator } from '../lib/reasoning/orchestrator';

export class App {
  private container: HTMLElement;
  private modelLoader: ModelLoader;
  private gitParser: GitRepositoryParser;
  private reasoningOrchestrator: ReasoningOrchestrator;
  private repositoryData: RepositoryData | null = null;
  
  // UI Elements
  private landingInput!: HTMLInputElement;
  private landingSubmit!: HTMLButtonElement;
  private loadingStatus!: HTMLElement;
  private chatMessages!: HTMLElement;
  private chatInput!: HTMLTextAreaElement;
  private chatSendBtn!: HTMLButtonElement;
  
  // State
  // private currentView: 'landing' | 'loading' | 'chat' = 'landing';

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
      <div class="view-container active" id="landing-view">
        <div class="input__container">
          <div class="shadow__input"></div>
          <button class="input__button__shadow" id="landing-submit">
             <svg fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" height="20px" width="20px">
              <path d="M4 9a5 5 0 1110 0A5 5 0 014 9zm5-7a7 7 0 104.2 12.6.999.999 0 00.093.107l3 3a1 1 0 001.414-1.414l-3-3a.999.999 0 00-.107-.093A7 7 0 009 2z" fill-rule="evenodd" fill="#17202A"></path>
            </svg>
          </button>
          <input type="text" name="text" class="input__search" id="landing-input" placeholder="Enter Git URL (e.g. https://github.com/org/repo)">
        </div>
      </div>

      <div class="view-container" id="loading-view">
        <div class="loader">
          <div class="box"></div>
          <svg>
            <defs>
              <filter id="goo">
                <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
                <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9" result="goo" />
                <feComposite in="SourceGraphic" in2="goo" operator="atop"/>
              </filter>
            </defs>
            <mask id="clipping">
              <g>
                <!-- 7 Polygons as expected by the CSS for the gooey effect -->
                <polygon points="50,15 65,40 35,40" /> 
                <polygon points="85,50 60,65 60,35" />
                <polygon points="75,85 50,60 100,60" />
                <polygon points="25,85 50,60 0,60" />
                <polygon points="15,50 40,65 40,35" />
                <polygon points="50,50 60,60 40,60" />
                <polygon points="50,50 55,45 45,45" />
              </g>
            </mask>
          </svg>
        </div>
        <div class="status-overlay" id="loading-status">Initializing...</div>
      </div>

      <div class="view-container" id="chat-view">
        <div class="chat-container">
          <div class="chat-header">
             <h1>sked</h1>
          </div>
          <div class="chat-messages" id="chat-messages">
             <div class="message assistant">
               <div class="message-sender">Assistant</div>
               <div class="message-bubble">
                 Repository loaded. I can help with architecture, security, and quality analysis. What would you like to know?
               </div>
             </div>
          </div>
          <div class="chat-input-area">
            <textarea class="chat-input" id="chat-input" placeholder="Ask a question about the codebase..."></textarea>
            <button class="chat-send-btn" id="chat-send">Send</button>
          </div>
        </div>
      </div>
    `;

    // Bind elements
    this.landingInput = this.container.querySelector('#landing-input') as HTMLInputElement;
    this.landingSubmit = this.container.querySelector('#landing-submit') as HTMLButtonElement;
    this.loadingStatus = this.container.querySelector('#loading-status') as HTMLElement;
    this.chatMessages = this.container.querySelector('#chat-messages') as HTMLElement;
    this.chatInput = this.container.querySelector('#chat-input') as HTMLTextAreaElement;
    this.chatSendBtn = this.container.querySelector('#chat-send') as HTMLButtonElement;

    this.setupEventListeners();
    this.switchView('landing');
  }

  private switchView(view: 'landing' | 'loading' | 'chat'): void {
    // this.currentView = view;
    
    // Hide all
    this.container.querySelectorAll('.view-container').forEach(el => {
      el.classList.remove('active');
    });

    // Show current
    const viewEl = this.container.querySelector(`#${view}-view`);
    if (viewEl) viewEl.classList.add('active');
  }

  private setupEventListeners(): void {
    // Landing Page
    this.landingSubmit.addEventListener('click', () => this.handleFetch());
    this.landingInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.handleFetch();
      }
    });

    // Chat Page
    this.chatSendBtn.addEventListener('click', () => this.sendMessage());
    this.chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });
  }

  private async handleFetch(): Promise<void> {
    const url = this.landingInput.value.trim();
    if (!url) {
      alert('Please enter a Git URL');
      return;
    }

    this.switchView('loading');
    this.updateStatus('Fetching repository...');

    try {
      const data = await this.fetchRepositoryFromUrl(url);
      this.repositoryData = data;
      this.updateStatus(`Analyzed ${data.totalFiles} files. Preparing chat...`);
      
      // Artificial delay to show the "ready" state briefly or just switch
      setTimeout(() => {
        this.switchView('chat');
      }, 800);
      
    } catch (error) {
      console.error('Fetch error:', error);
      this.updateStatus(`Error: ${error instanceof Error ? error.message : 'Failed to fetch'}`);
      // Return to landing after error (with delay)
      setTimeout(() => {
        this.switchView('landing');
        alert(`Error: ${error instanceof Error ? error.message : 'Failed to fetch'}`);
      }, 2000);
    }
  }

  private updateStatus(msg: string): void {
    if (this.loadingStatus) this.loadingStatus.textContent = msg;
  }

  private async sendMessage(): Promise<void> {
    const question = this.chatInput.value.trim();
    if (!question || !this.repositoryData) return;

    this.addMessage('user', question);
    this.chatInput.value = '';
    this.chatInput.disabled = true;
    this.chatSendBtn.disabled = true;

    // Optional: show temporary loading message or keep user on chat view
    const loadingId = this.addMessage('assistant', 'Analyzing...', true);

    try {
      // 1. Reasoning
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

      // 2. Model Response
      const context = this.gitParser.formatRepositoryContext(this.repositoryData);
      const response = await this.modelLoader.analyzeRepository(context, question, reasoningResult.summary, 'general');
      
      this.updateMessage(loadingId, response);
    } catch (error) {
      console.error('Chat error:', error);
      this.updateMessage(loadingId, `Error: ${error instanceof Error ? error.message : 'Failed to generate response'}`);
    } finally {
      this.chatInput.disabled = false;
      this.chatSendBtn.disabled = false;
      this.chatInput.focus();
    }
  }

  private addMessage(role: 'user' | 'assistant', content: string, isLoading = false): string {
    const messageId = `msg-${Date.now()}-${Math.random()}`;
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    messageDiv.id = messageId;

    const senderDiv = document.createElement('div');
    senderDiv.className = 'message-sender';
    senderDiv.textContent = role === 'user' ? 'You' : 'Assistant';

    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = 'message-bubble';
    
    if (isLoading) {
      bubbleDiv.innerHTML = '<i>Analyzing...</i>';
    } else {
      bubbleDiv.innerHTML = this.formatContent(content);
    }

    messageDiv.appendChild(senderDiv);
    messageDiv.appendChild(bubbleDiv);
    
    this.chatMessages.appendChild(messageDiv);
    this.scrollToBottom();
    
    return messageId;
  }

  private updateMessage(messageId: string, content: string): void {
    const messageDiv = document.getElementById(messageId);
    if (messageDiv) {
      const bubble = messageDiv.querySelector('.message-bubble');
      if (bubble) {
        bubble.innerHTML = this.formatContent(content);
      }
    }
    this.scrollToBottom();
  }

  private formatContent(content: string): string {
    // Simple markdown-like formatting
    return content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }, 50);
  }

  private async fetchRepositoryFromUrl(repoUrl: string): Promise<RepositoryData> {
    const candidates = this.buildZipUrls(repoUrl);
    let resp: Response | null = null;
    let lastError: Error | null = null;

    for (const candidate of candidates) {
      try {
        console.log(`Trying to fetch zip from: ${candidate}`);
        const r = await fetch(candidate);
        if (r.ok) {
          resp = r;
          break;
        } else {
            console.warn(`Failed to fetch ${candidate}: ${r.status} ${r.statusText}`);
        }
      } catch (e) {
        lastError = e instanceof Error ? e : new Error(String(e));
        console.warn(`Network error fetching ${candidate}:`, e);
      }
    }

    if (!resp) {
        throw new Error(`Could not fetch repository zip. Checked ${candidates.length} URLs. Last error: ${lastError?.message || '404 Not Found'}`);
    }

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
  
  // Helpers from original code
  private buildZipUrls(repoUrl: string): string[] {
    const cleaned = repoUrl.replace(/\.git$/, '');
    const parts = cleaned.split('/');
    // Handle URL formats like:
    // https://github.com/owner/repo
    // https://github.com/owner/repo/tree/branch
    
    // Find 'github.com' index to locate owner/repo reliably
    const githubIndex = parts.findIndex(p => p.includes('github.com'));
    if (githubIndex === -1 || parts.length < githubIndex + 3) {
        // Fallback for non-standard or direct formats if needed, or return empty to fail fast
        return [];
    }
    
    const owner = parts[githubIndex + 1];
    const repo = parts[githubIndex + 2];
    
    let branch = 'main';
    // Check for /tree/branch pattern
    const treeIndex = parts.indexOf('tree');
    if (treeIndex > -1 && parts[treeIndex + 1]) {
      branch = parts[treeIndex + 1];
    }

    const codeloadBase = `https://codeload.github.com/${owner}/${repo}/zip/refs/heads`;
    const apiBase = `https://api.github.com/repos/${owner}/${repo}/zipball`;

    // Prioritize specific branch if found, then main, then master
    // Also try the API endpoint as a fallback (it redirects to codeload but might handle headers differently)
    return [
        `${codeloadBase}/${branch}`,
        `${codeloadBase}/main`,
        `${codeloadBase}/master`,
        `${apiBase}/${branch}`,
        `${apiBase}/main`,
        `${apiBase}/master`
    ];
  }

  private normalizeZipPath(path: string): string {
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

  private async initializeModel(): Promise<void> {
    // Hidden initialization in background
    try {
      await this.modelLoader.initialize();
      console.log('Model initialized');
    } catch (error) {
      console.error('Model initialization error:', error);
    }
  }
}
