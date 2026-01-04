import { ReasoningContext, ReasoningResult } from './types';

export class AdaReasoner {
  async analyze(context: ReasoningContext, question: string): Promise<ReasoningResult> {
    const insights: string[] = [];
    const focusAreas: string[] = [];
    
    // 1. Adaptive Language Detection & Specific Checks
    const extensions: Record<string, number> = {};
    context.files.forEach(f => {
      const ext = f.path.split('.').pop() || 'unknown';
      extensions[ext] = (extensions[ext] || 0) + 1;
    });

    const dominantLang = Object.entries(extensions).sort((a, b) => b[1] - a[1])[0]?.[0];
    
    if (dominantLang) {
      insights.push(`Dominant language detected: ${dominantLang}. Applying ${dominantLang}-specific heuristics.`);
      
      if (['js', 'ts', 'jsx', 'tsx'].includes(dominantLang)) {
        focusAreas.push('NPM Dependencies', 'Async/Await Usage', 'React/Node patterns');
        insights.push('Checking for common JS/TS risks (prototype pollution, injection).');
      } else if (['py'].includes(dominantLang)) {
        focusAreas.push('Pip Dependencies', 'Pythonic Idioms', 'Type Hinting');
        insights.push('Checking for common Python risks (pickle, eval, input).');
      } else if (['rs'].includes(dominantLang)) {
        focusAreas.push('Memory Safety', 'Concurrency');
        insights.push('Rust codebase detected. Focusing on safety guarantees.');
      } else if (['go'].includes(dominantLang)) {
        focusAreas.push('Goroutines', 'Error Handling');
        insights.push('Go codebase detected. Focusing on concurrency patterns.');
      }
    }

    // 2. Complexity & Depth Assessment
    if (context.totalFiles > 100) {
      insights.push('Large repository detected (>100 files). Applying macro-level architectural analysis first.');
      focusAreas.push('Module Boundaries', 'Microservices/Monolith Structure');
    } else {
      insights.push('Small/Medium repository. Applying micro-level code analysis.');
      focusAreas.push('Function Logic', 'Variable Naming', 'Code Style');
    }

    // 3. Perspective selection heuristic
    if (question.toLowerCase().includes('optimize') || question.toLowerCase().includes('fast')) {
      insights.push(`Perspective: Performance Engineer - Focusing on loops, database queries, and resource usage.`);
    } else if (question.toLowerCase().includes('hack') || question.toLowerCase().includes('secure')) {
      insights.push(`Perspective: Attacker - Looking for entry points, unvalidated inputs, and weak auth.`);
    } else {
      insights.push(`Perspective: Maintainer - Evaluating code clarity, documentation, and structure.`);
    }

    return {
      source: 'AdaReasoner',
      insights,
      confidence: 0.9,
      focusAreas: [...new Set(focusAreas)]
    };
  }
}
