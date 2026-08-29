export interface AiEvaluationPrompt {
  id: string;
  prompt: string;
  expectedKeywords?: string[];
  forbiddenKeywords?: string[];
  expectedJsonSchema?: Record<string, string>;
  groundTruthContext?: string;
}

export interface AiEvaluationResult {
  promptId: string;
  prompt: string;
  output: string;
  passed: boolean;
  faithfulnessScore: number; // 0 - 100
  hallucinationDetected: boolean;
  schemaValid: boolean;
  latencyMs: number;
  reasons: string[];
}

export interface AiHallucinationReport {
  endpointOrModel: string;
  totalEvaluated: number;
  passedCount: number;
  hallucinationCount: number;
  averageFaithfulnessScore: number; // 0 - 100
  overallVerdict: 'HIGHLY_ACCURATE' | 'MODERATE_DRIFT' | 'HALLUCINATION_PRONE';
  results: AiEvaluationResult[];
  summary: string;
}

export class AiHallucinationEvaluatorService {
  /**
   * Evaluates AI & LLM outputs against ground-truth context, forbidden tokens, and JSON schemas
   */
  public static async evaluate(options: {
    endpointUrl?: string;
    modelResponses?: { promptId: string; prompt: string; response: string }[];
    testCases: AiEvaluationPrompt[];
  }): Promise<AiHallucinationReport> {
    const results: AiEvaluationResult[] = [];

    for (const testCase of options.testCases) {
      const startTime = Date.now();
      let output = '';

      if (options.modelResponses) {
        const found = options.modelResponses.find(r => r.promptId === testCase.id);
        output = found ? found.response : '';
      } else if (options.endpointUrl) {
        try {
          const res = await fetch(options.endpointUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: testCase.prompt })
          });
          const data: any = await res.json();
          output = typeof data === 'string' ? data : data.response || data.text || JSON.stringify(data);
        } catch (err: any) {
          output = `Error: ${err.message}`;
        }
      }

      const latencyMs = Date.now() - startTime;
      const reasons: string[] = [];
      let hallucinationDetected = false;
      let score = 100;
      let schemaValid = true;

      // 1. Check Expected Keywords
      if (testCase.expectedKeywords && testCase.expectedKeywords.length > 0) {
        for (const kw of testCase.expectedKeywords) {
          if (!output.toLowerCase().includes(kw.toLowerCase())) {
            score -= 20;
            reasons.push(`Missing expected keyword: "${kw}"`);
          }
        }
      }

      // 2. Check Forbidden Tokens (Hallucinated terms or toxic output)
      if (testCase.forbiddenKeywords && testCase.forbiddenKeywords.length > 0) {
        for (const fKw of testCase.forbiddenKeywords) {
          if (output.toLowerCase().includes(fKw.toLowerCase())) {
            hallucinationDetected = true;
            score -= 40;
            reasons.push(`Detected forbidden / hallucinated entity: "${fKw}"`);
          }
        }
      }

      // 3. Check JSON Schema Validity if required
      if (testCase.expectedJsonSchema) {
        try {
          const parsed = JSON.parse(output);
          for (const [key, type] of Object.entries(testCase.expectedJsonSchema)) {
            if (!(key in parsed)) {
              schemaValid = false;
              reasons.push(`Missing JSON key: "${key}"`);
              score -= 20;
            } else if (typeof parsed[key] !== type) {
              schemaValid = false;
              reasons.push(`Field "${key}" expected type ${type}, got ${typeof parsed[key]}`);
              score -= 15;
            }
          }
        } catch {
          schemaValid = false;
          reasons.push('Output is not valid JSON despite schema requirement');
          score -= 30;
        }
      }

      // 4. Ground Truth Cross-Verification
      if (testCase.groundTruthContext && output.length > 0) {
        const words = output.toLowerCase().split(/\s+/).filter(w => w.length > 5);
        const ground = testCase.groundTruthContext.toLowerCase();
        let groundedWords = 0;
        for (const w of words) {
          if (ground.includes(w)) groundedWords++;
        }
        if (words.length > 0 && (groundedWords / words.length) < 0.25) {
          hallucinationDetected = true;
          score -= 25;
          reasons.push('Low contextual grounding: response diverges from provided ground truth facts');
        }
      }

      score = Math.max(0, Math.min(100, score));
      const passed = score >= 70 && !hallucinationDetected && schemaValid;

      results.push({
        promptId: testCase.id,
        prompt: testCase.prompt,
        output,
        passed,
        faithfulnessScore: score,
        hallucinationDetected,
        schemaValid,
        latencyMs,
        reasons
      });
    }

    let passedCount = 0;
    let hallucinationCount = 0;
    let totalScore = 0;

    for (const r of results) {
      if (r.passed) passedCount++;
      if (r.hallucinationDetected) hallucinationCount++;
      totalScore += r.faithfulnessScore;
    }

    const total = results.length;
    const avgScore = total > 0 ? Math.round(totalScore / total) : 100;

    let overallVerdict: AiHallucinationReport['overallVerdict'] = 'HIGHLY_ACCURATE';
    if (avgScore < 60 || hallucinationCount > 1) {
      overallVerdict = 'HALLUCINATION_PRONE';
    } else if (avgScore < 85 || hallucinationCount > 0) {
      overallVerdict = 'MODERATE_DRIFT';
    }

    const summary = `${overallVerdict} (Accuracy: ${avgScore}%): Evaluated ${total} AI test cases. ${passedCount} passed, ${hallucinationCount} hallucination(s) detected.`;

    return {
      endpointOrModel: options.endpointUrl || 'ModelResponses',
      totalEvaluated: total,
      passedCount,
      hallucinationCount,
      averageFaithfulnessScore: avgScore,
      overallVerdict,
      results,
      summary
    };
  }
}
