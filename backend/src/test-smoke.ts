import { scoreLead } from './utils/scoring';
import { validateQuestionAnswer } from './utils/validation';
import jwt from 'jsonwebtoken';

function runTests() {
  console.log('🧪 Running Backend Smoke Tests...');
  let failures = 0;

  // Helper assert
  function assert(condition: boolean, message: string) {
    if (!condition) {
      console.error(`❌ FAIL: ${message}`);
      failures++;
    } else {
      console.log(`✅ PASS: ${message}`);
    }
  }

  // ── Test 1: Scoring Engine (Founder Hot Bucket) ──
  try {
    const hotAnswers = {
      years_experience: '5+',
      founder_role: 'Technical',
      problem_description: 'a'.repeat(250), // fits length rules (>200)
      target_customer: 'b'.repeat(120),    // fits length rules (>100)
      mvp_status: 'Live',
      monthly_revenue: '$100K+',
      user_count: '1000+',
      team_size: '3-4',
      team_background: 'Technical',
      funding_ask_amount: 500000,
      funding_use: 'c'.repeat(200),
      validation_evidence: 'd'.repeat(250) + ' 100 users', // has digits
    };

    const result = scoreLead('founder', hotAnswers);
    assert(result.score >= 80, `Founder scoring should result in a Hot score (Actual score: ${result.score})`);
    assert(result.bucket === 'hot', `Founder lead should map to 'hot' bucket (Actual bucket: ${result.bucket})`);
  } catch (err: any) {
    assert(false, `Scoring engine crashed: ${err.message}`);
  }

  // ── Test 2: Scoring Engine (Founder Low Bucket) ──
  try {
    const lowAnswers = {
      years_experience: '0',
      founder_role: 'Other',
      problem_description: 'too short',
      target_customer: 'too short',
      mvp_status: 'Idea',
      monthly_revenue: 'Pre-revenue',
      user_count: '0',
      team_size: 'Just me',
      team_background: 'Business',
      funding_ask_amount: 10000, // penalty range
      funding_use: 'short funding use',
      validation_evidence: 'no evidence',
    };

    const result = scoreLead('founder', lowAnswers);
    assert(result.score < 40, `Founder scoring should result in a Low score (Actual score: ${result.score})`);
    assert(result.bucket === 'low', `Founder lead should map to 'low' bucket (Actual bucket: ${result.bucket})`);
  } catch (err: any) {
    assert(false, `Scoring engine crashed: ${err.message}`);
  }

  // ── Test 3: Zod Validation Rejection (Email & Text length checks) ──
  try {
    // Mock question schema for email
    const emailQuestion = {
      id: 'q1',
      key: 'email',
      input_type: 'text' as const,
      validation: { required: true, pattern: 'email' },
    };

    const validEmailRes = validateQuestionAnswer(emailQuestion.input_type, emailQuestion.validation, {}, 'test@example.com');
    assert(validEmailRes.success === true, 'Email validation should pass for valid address');

    const invalidEmailRes = validateQuestionAnswer(emailQuestion.input_type, emailQuestion.validation, {}, 'not-an-email');
    assert(invalidEmailRes.success === false, 'Email validation should reject invalid address format');
    assert(
      invalidEmailRes.success === false && invalidEmailRes.error === 'Please enter a valid email address.',
      'Email error message should match expected friendly wording'
    );

    // Mock question schema for minimum length
    const minLengthQuestion = {
      id: 'q2',
      key: 'problem_description',
      input_type: 'textarea' as const,
      validation: { required: true, minLength: 20 },
    };

    const shortTextRes = validateQuestionAnswer(minLengthQuestion.input_type, minLengthQuestion.validation, {}, 'Short');
    assert(shortTextRes.success === false, 'Validation should reject text under the minimum character limit');
  } catch (err: any) {
    assert(false, `Validation schema crashed: ${err.message}`);
  }

  // ── Test 4: JWT Signing and Verification ──
  try {
    const secret = 'test-secret';
    const payload = { id: 'admin123', email: 'test@venturizer.co', name: 'Tester' };
    const token = jwt.sign(payload, secret, { expiresIn: '1h' });
    
    const decoded = jwt.verify(token, secret) as typeof payload;
    assert(decoded.id === 'admin123', 'JWT decoded user ID should match payload');
    assert(decoded.email === 'test@venturizer.co', 'JWT decoded email should match payload');
  } catch (err: any) {
    assert(false, `JWT test failed: ${err.message}`);
  }

  console.log('\n--- SMOKE TESTS COMPLETED ---');
  if (failures > 0) {
    console.error(`❌ ${failures} test failure(s) recorded!`);
    process.exit(1);
  } else {
    console.log('🎉 All smoke tests passed successfully!');
    process.exit(0);
  }
}

runTests();
