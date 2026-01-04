import { ReasoningContext, ReasoningResult } from './types';

export class OpenReasoner {
  async analyze(context: ReasoningContext, question: string): Promise<ReasoningResult> {
    const insights: string[] = [];
    const focusAreas: string[] = [];
    
    // 1. Structure Analysis
    const structureLines = context.structure.split('\n');
    const depth = Math.max(...structureLines.map(l => (l.match(/^  */)?.[0]?.length || 0) / 2));
    insights.push(`Repository structure has a maximum depth of ${depth}.`);
    
    // 2. Key File Identification
    const files = context.files.map(f => f.path.split('/').pop() || '');
    const keyFiles = ['README.md', 'package.json', 'requirements.txt', 'Dockerfile', 'docker-compose.yml', 'main.py', 'index.js', 'App.ts'];
    const foundKeyFiles = files.filter(f => keyFiles.includes(f));
    if (foundKeyFiles.length > 0) {
      insights.push(`Identified key configuration/entry files: ${foundKeyFiles.join(', ')}.`);
    }

    // 3. Pattern Extraction (Scanning for specific keywords in file contents)
    // We scan a sample of files to avoid performance bottlenecks if context is huge
    // In a real "no limit" scenario, we'd scan everything, but let's be efficient here.
    let securityKeywordsFound = 0;
    let todoFound = 0;
    
    context.files.forEach(file => {
      if (file.type === 'file') {
        const content = file.content.toLowerCase();
        if (content.includes('password') || content.includes('secret') || content.includes('api_key') || content.includes('token')) {
          securityKeywordsFound++;
        }
        if (content.includes('todo') || content.includes('fixme')) {
          todoFound++;
        }
      }
    });

    if (securityKeywordsFound > 0) {
      insights.push(`Found ${securityKeywordsFound} potential security-sensitive keywords (password, secret, token).`);
      focusAreas.push('Hardcoded Secrets', 'Configuration Files');
    }
    if (todoFound > 0) {
      insights.push(`Found ${todoFound} TODO/FIXME comments, indicating technical debt.`);
      focusAreas.push('Code Quality', 'Technical Debt');
    }

    // 4. Question Decomposition & Intent Analysis
    const qLower = question.toLowerCase();
    if (qLower.includes('security') || qLower.includes('vulnerability') || qLower.includes('exploit')) {
      focusAreas.push('Vulnerability Assessment', 'Exploit Analysis', 'Dependency Check');
      insights.push('User intent is focused on SECURITY. Prioritizing vulnerability scanning.');
    } else if (qLower.includes('architecture') || qLower.includes('design') || qLower.includes('structure')) {
      focusAreas.push('System Design', 'Data Flow', 'Component Interaction');
      insights.push('User intent is focused on ARCHITECTURE. Prioritizing structural analysis.');
    } else if (qLower.includes('bug') || qLower.includes('fix') || qLower.includes('error')) {
      focusAreas.push('Error Handling', 'Logic Flaws', 'Debugging');
      insights.push('User intent is focused on BUG FIXING. Prioritizing logic analysis.');
    }

    return {
      source: 'OpenReason',
      insights,
      confidence: 0.85 + (foundKeyFiles.length * 0.02), // Higher confidence if we recognize the structure
      focusAreas: [...new Set(focusAreas)],
      suggestedPrompts: [
        'Detailed security audit of ' + (foundKeyFiles[0] || 'codebase'),
        'Explain the architectural patterns used',
        'List all found TODOs and their implications'
      ]
    };
  }

  async preProcess(context: ReasoningContext): Promise<string> {
    // Generate a structured summary for the LLM
    const totalSizeKB = (context.totalSize / 1024).toFixed(2);
    const fileTypes = new Set(context.files.map(f => f.path.split('.').pop()).filter(Boolean));
    
    return `OPENREASON PRE-ANALYSIS:
- Repository Size: ${totalSizeKB} KB
- File Count: ${context.totalFiles}
- Detected Languages/Types: ${Array.from(fileTypes).join(', ')}
- Context: The user has provided a full repository dump.
- Recommendation: Cross-reference files to understand dependencies.`;
  }
}
