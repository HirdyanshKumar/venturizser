import { ScoreBreakdown } from './scoring';

export interface AIAnalysisResult {
  summary: string;
  tags: string[];
  flags: string[];
  clarification_question?: string;
}

const CATEGORY_WEIGHTS: Record<string, number> = {
  founder_background: 10,
  market_fit: 10,
  mvp_traction: 25,
  team: 20,
  funding_clarity: 15,
  problem_validation: 20,
  thesis_alignment: 30,
  stage_fit: 20,
  check_size: 15,
  engagement_model: 20,
  deployment_readiness: 15,
};

/**
 * Identifies the category in the breakdown that scored the lowest
 * relative to its maximum possible rubric weight.
 */
export function getWeakestCategory(breakdown: ScoreBreakdown): string {
  let weakest = '';
  let minRatio = Infinity;

  for (const [cat, score] of Object.entries(breakdown)) {
    const weight = CATEGORY_WEIGHTS[cat] || 10;
    const ratio = score / weight;
    if (ratio < minRatio) {
      minRatio = ratio;
      weakest = cat;
    }
  }

  return weakest;
}

/**
 * Calls the Groq Chat Completion API to get summary, tags, flags,
 * and (optionally) a targeted clarification question.
 */
export async function analyzeLeadWithAI(
  flowType: 'founder' | 'investor',
  qaList: { question: string; answer: any }[],
  weakestCategory: string
): Promise<AIAnalysisResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured in environment.');
  }

  // Format the Q&A list into a clean text block for the prompt
  const qaBlock = qaList
    .map((item, idx) => `Q${idx + 1}: ${item.question}\nA${idx + 1}: ${JSON.stringify(item.answer)}`)
    .join('\n\n');

  const systemPrompt = `You are a venture capitalist investment analyst at Venturizer.
Analyze the following application responses from a ${flowType}.

Produce a JSON response containing:
1. "summary": A 3-4 sentence plain-English summary of the application (e.g. "Pre-seed SaaS founder with working MVP, 100 users, and $10K MRR. Strong technical team raising $250K. Weak validation evidence on target customer pain points.")
2. "tags": 3-5 sector/industry/stage tags (e.g. ["Fintech", "SaaS", "Pre-seed"])
3. "flags": A list of potential flags or concerns (e.g. "Funding ask is too high for current traction", "No technical co-founder on team"). Return an empty array if there are no major flags.
4. "clarification_question": A polite, professional clarification question targeting the applicant's weakest scoring category: "${weakestCategory}". Frame it as a follow-up to help them explain this aspect better.

You MUST respond with a JSON object matching this exact format:
{
  "summary": "string",
  "tags": ["string"],
  "flags": ["string"],
  "clarification_question": "string"
}`;

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: qaBlock },
      ],
      temperature: 0.2,
      max_tokens: 800,
    }),
  });

  if (!response.ok) {
    throw new Error(`Groq API returned HTTP ${response.status}: ${await response.text()}`);
  }

  const payload = (await response.json()) as any;
  const content = payload?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Empty response from Groq');
  }

  return JSON.parse(content) as AIAnalysisResult;
}
