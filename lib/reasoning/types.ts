import { RepositoryFile } from '../gitParser';

export interface ReasoningContext {
  files: RepositoryFile[];
  structure: string;
  totalFiles: number;
  totalSize: number;
  metadata?: any;
}

export interface ReasoningResult {
  source: 'OpenReason' | 'AdaReasoner';
  insights: string[];
  confidence: number;
  focusAreas: string[];
  suggestedPrompts?: string[];
}

export interface CombinedReasoning {
  summary: string;
  securityConcerns: string[];
  architectureInsights: string[];
  codeQualityIssues: string[];
  aggregatedConfidence: number;
}
