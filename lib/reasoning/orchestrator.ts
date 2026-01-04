import { OpenReasoner } from './openReason';
import { AdaReasoner } from './adaReasoner';
import { ReasoningContext, CombinedReasoning, ReasoningResult } from './types';

export class ReasoningOrchestrator {
  private openReasoner: OpenReasoner;
  private adaReasoner: AdaReasoner;

  constructor() {
    this.openReasoner = new OpenReasoner();
    this.adaReasoner = new AdaReasoner();
  }

  async analyze(context: ReasoningContext, question: string): Promise<CombinedReasoning> {
    // Run reasoning in parallel
    const [openResult, adaResult] = await Promise.all([
      this.openReasoner.analyze(context, question),
      this.adaReasoner.analyze(context, question)
    ]);

    return this.combineResults(openResult, adaResult);
  }

  private combineResults(open: ReasoningResult, ada: ReasoningResult): CombinedReasoning {
    const allInsights = [...open.insights, ...ada.insights];
    const uniqueInsights = [...new Set(allInsights)];

    const securityConcerns = uniqueInsights.filter(i => 
      i.toLowerCase().includes('security') || 
      i.toLowerCase().includes('vulnerability') ||
      i.toLowerCase().includes('auth')
    );

    const architectureInsights = uniqueInsights.filter(i => 
      i.toLowerCase().includes('architecture') || 
      i.toLowerCase().includes('structure') ||
      i.toLowerCase().includes('flow')
    );

    const codeQualityIssues = uniqueInsights.filter(i =>
      i.toLowerCase().includes('todo') ||
      i.toLowerCase().includes('technical debt') ||
      i.toLowerCase().includes('readability') ||
      i.toLowerCase().includes('code quality')
    );

    return {
      summary: `Combined analysis from OpenReason and AdaReasoner. Focus: ${[...open.focusAreas, ...ada.focusAreas].join(', ')}`,
      securityConcerns,
      architectureInsights,
      codeQualityIssues,
      aggregatedConfidence: (open.confidence + ada.confidence) / 2
    };
  }
}

