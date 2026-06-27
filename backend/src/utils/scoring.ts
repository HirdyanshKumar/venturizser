export interface ScoreBreakdown {
  [category: string]: number; // Category name -> calculated score out of its weight
}

export interface ScoringResult {
  score: number;       // Final weighted score (0-100)
  bucket: 'hot' | 'good' | 'maybe' | 'low';
  breakdown: ScoreBreakdown;
}

/**
 * Calculates the score for a Founder lead based on responses.
 * Max score is 100.
 */
function calculateFounderScore(answers: Record<string, any>): ScoringResult {
  const breakdown: ScoreBreakdown = {};

  // 1. founder_background (Weight: 10)
  // years_experience: {"0":0, "1-2":3, "3-5":7, "5+":10}
  // founder_role: {"Technical":10, "Business":8, "Design":7, "Other":5}
  // Max raw points = 20
  const expVal = String(answers['years_experience'] || '0');
  const roleVal = String(answers['founder_role'] || 'Other');
  
  const expPointsMap: Record<string, number> = { '0': 0, '1-2': 3, '3-5': 7, '5+': 10 };
  const rolePointsMap: Record<string, number> = { 'Technical': 10, 'Business': 8, 'Design': 7, 'Domain expert': 7, 'Other': 5 };
  
  const expPts = expPointsMap[expVal] !== undefined ? expPointsMap[expVal] : 0;
  const rolePts = rolePointsMap[roleVal] !== undefined ? rolePointsMap[roleVal] : 5;
  breakdown['founder_background'] = Math.round(((expPts + rolePts) / 20) * 10);

  // 2. market_fit (Weight: 10)
  // Scored by LLM. Heuristic: length and keyword matching
  const problemDesc = String(answers['problem_description'] || '');
  const targetCust = String(answers['target_customer'] || '');
  let marketFitRaw = 5; // base
  if (problemDesc.length > 200) marketFitRaw += 2;
  if (targetCust.length > 100) marketFitRaw += 2;
  if (problemDesc.toLowerCase().includes('invoicing') || problemDesc.toLowerCase().includes('payment')) marketFitRaw += 1;
  breakdown['market_fit'] = Math.min(10, marketFitRaw);

  // 3. mvp_traction (Weight: 25)
  // mvp_status: {"Idea":0, "Prototype":8, "Beta":16, "Live":25}
  // monthly_revenue: {"Pre-revenue":0, "$1-$10K":5, "$10K-$100K":10, "$100K+":15}
  // user_count: {"None yet":0, "1-10":2, "10-100":5, "100-1000":8, "1000+":10}
  // Max raw points = 50
  const mvpStatus = String(answers['mvp_status'] || 'Idea');
  const revenue = String(answers['monthly_revenue'] || 'Pre-revenue');
  const users = String(answers['user_count'] || '0');

  const mvpPointsMap: Record<string, number> = { 'Idea': 0, 'Prototype': 8, 'Beta': 16, 'Live': 25 };
  const revPointsMap: Record<string, number> = { 'Pre-revenue': 0, '$1-$10K': 5, '$10K-$100K': 10, '$100K+': 15 };
  const userPointsMap: Record<string, number> = { '0': 0, '1-10': 2, '10-100': 5, '100-1000': 8, '1000+': 10 };

  const mvpPts = mvpPointsMap[mvpStatus] !== undefined ? mvpPointsMap[mvpStatus] : 0;
  const revPts = revPointsMap[revenue] !== undefined ? revPointsMap[revenue] : 0;
  const userPts = userPointsMap[users] !== undefined ? userPointsMap[users] : 0;
  breakdown['mvp_traction'] = Math.round(((mvpPts + revPts + userPts) / 50) * 25);

  // 4. team (Weight: 20)
  // team_size: {"Just me":5, "2":10, "3-4":15, "5+":20}
  // team_background: {"Technical":20, "Mixed":18, "Business":14, "Domain expert":12}
  // Max raw points = 40
  const teamSize = String(answers['team_size'] || 'Just me');
  const teamBg = String(answers['team_background'] || 'Business');

  const sizePointsMap: Record<string, number> = { 'Just me': 5, '2': 10, '3-4': 15, '5+': 20 };
  const bgPointsMap: Record<string, number> = { 'Technical': 20, 'Mixed': 18, 'Business': 14, 'Domain expert': 12 };

  const sizePts = sizePointsMap[teamSize] !== undefined ? sizePointsMap[teamSize] : 5;
  const bgPts = bgPointsMap[teamBg] !== undefined ? bgPointsMap[teamBg] : 12;
  breakdown['team'] = Math.round(((sizePts + bgPts) / 40) * 20);

  // 5. funding_clarity (Weight: 15)
  // Scored by LLM + check boundaries.
  const askAmount = Number(answers['funding_ask_amount'] || 0);
  const fundingUse = String(answers['funding_use'] || '');
  let fundingRaw = 8; // base
  if (askAmount >= 50000 && askAmount <= 2000000) {
    fundingRaw += 3;
  } else {
    fundingRaw -= 3; // penalty
  }
  if (fundingUse.length > 150) fundingRaw += 4;
  breakdown['funding_clarity'] = Math.max(0, Math.min(15, fundingRaw));

  // 6. problem_validation (Weight: 20)
  // Scored by LLM. Heuristic: length and numeric indicators of traction
  const validationEvidence = String(answers['validation_evidence'] || '');
  let valRaw = 10; // base
  if (validationEvidence.length > 200) valRaw += 6;
  // If text contains numbers like % or specific rupee/dollar traction signals
  if (/\d+/.test(validationEvidence)) valRaw += 4;
  breakdown['problem_validation'] = Math.min(20, valRaw);

  // Sum categories
  const finalScore = Object.values(breakdown).reduce((sum, val) => sum + val, 0);

  return {
    score: finalScore,
    bucket: getBucket(finalScore),
    breakdown,
  };
}

/**
 * Calculates the score for an Investor lead based on responses.
 * Max score is 100.
 */
function calculateInvestorScore(answers: Record<string, any>): ScoringResult {
  const breakdown: ScoreBreakdown = {};

  // 1. thesis_alignment (Weight: 30)
  const thesis = String(answers['investment_thesis'] || '');
  let thesisRaw = 15; // base
  if (thesis.length > 200) thesisRaw += 10;
  if (answers['geographic_focus'] && Array.isArray(answers['geographic_focus'])) {
    thesisRaw += 5;
  }
  breakdown['thesis_alignment'] = Math.min(30, thesisRaw);

  // 2. stage_fit (Weight: 20)
  // Focused stage count yields higher score: 1 stage = 20, 2 stages = 16, 3 stages = 12, 4+ = 8
  const stages = answers['stage_focus'] || [];
  const stageCount = Array.isArray(stages) ? stages.length : 1;
  let stagePts = 8;
  if (stageCount === 1) stagePts = 20;
  else if (stageCount === 2) stagePts = 16;
  else if (stageCount === 3) stagePts = 12;
  breakdown['stage_fit'] = stagePts;

  // 3. check_size (Weight: 15)
  // Check size within $50K-$2M range scores full 15, otherwise prorated
  const minCheck = Number(answers['check_size_min'] || 0);
  const maxCheck = Number(answers['check_size_max'] || 0);
  let checkPts = 15;
  if (minCheck < 50000 || maxCheck > 2000000) {
    checkPts = 10; // penalty for very high or very low limits
  }
  breakdown['check_size'] = checkPts;

  // 4. engagement_model (Weight: 20)
  // support: {"Capital only":8, "Mentorship":14, "Operational support":18, "Network":16, "All of the above":20}
  const supportVal = String(answers['support_model'] || 'Capital only');
  const supportPointsMap: Record<string, number> = {
    'Capital only': 8,
    'Mentorship': 14,
    'Operational support': 18,
    'Network': 16,
    'All of the above': 20,
  };
  breakdown['engagement_model'] = supportPointsMap[supportVal] || 8;

  // 5. deployment_readiness (Weight: 15)
  // timeline: {"Immediately":15, "1-3 months":12, "3-6 months":8, "Opportunistic":5}
  const timelineVal = String(answers['deployment_timeline'] || 'Opportunistic');
  const timelinePointsMap: Record<string, number> = {
    'Immediately': 15,
    '1-3 months': 12,
    '3-6 months': 8,
    'Opportunistic': 5,
  };
  breakdown['deployment_readiness'] = timelinePointsMap[timelineVal] || 5;

  const finalScore = Object.values(breakdown).reduce((sum, val) => sum + val, 0);

  return {
    score: finalScore,
    bucket: getBucket(finalScore),
    breakdown,
  };
}

/** Helper to map numerical score to descriptive bucket */
function getBucket(score: number): 'hot' | 'good' | 'maybe' | 'low' {
  if (score >= 80) return 'hot';
  if (score >= 60) return 'good';
  if (score >= 40) return 'maybe';
  return 'low';
}

/** Main entry point for scoring */
export function scoreLead(flowType: 'founder' | 'investor', answers: Record<string, any>): ScoringResult {
  if (flowType === 'founder') {
    return calculateFounderScore(answers);
  } else {
    return calculateInvestorScore(answers);
  }
}
