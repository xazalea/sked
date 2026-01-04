export class RefusalDetector {
  private refusalPatterns = [
    "I cannot",
    "I can't",
    "I am not able to",
    "I'm unable to",
    "I apologize, but",
    "I'm sorry, but",
    "As an AI language model",
    "I cannot assist with",
    "violates my safety guidelines",
    "against my programming",
    "unethical",
    "illegal",
    "harmful",
    "malicious purposes"
  ];

  isRefusal(response: string): boolean {
    const lowerResponse = response.toLowerCase();
    
    // Check for explicit refusal patterns at the beginning of the response
    // (first 100 characters to avoid false positives in long explanations)
    const startOfResponse = lowerResponse.substring(0, 100);
    
    return this.refusalPatterns.some(pattern => 
      startOfResponse.includes(pattern.toLowerCase())
    );
  }

  isQualityResponse(response: string): boolean {
    // Basic quality checks
    if (!response || response.trim().length < 10) return false;
    
    // Check if it's just a repetition of the prompt (heuristic)
    // ...
    
    return true;
  }
}

