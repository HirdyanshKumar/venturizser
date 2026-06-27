import { z } from 'zod';

export interface QuestionValidation {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  multiSelect?: boolean;
}

export interface SliderOptions {
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}

/**
 * Validates an answer for a specific question based on its input_type,
 * validation config, and options config.
 */
export function validateQuestionAnswer(
  inputType: string,
  validation: QuestionValidation,
  options: any,
  answer: any
): { success: true; data: any } | { success: false; error: string } {
  const isRequired = validation.required !== false;

  const isEmpty =
    answer === undefined ||
    answer === null ||
    (typeof answer === 'string' && answer.trim() === '') ||
    (Array.isArray(answer) && answer.length === 0);

  if (isEmpty) {
    if (isRequired) {
      return { success: false, error: 'This field is required.' };
    }
    return { success: true, data: answer };
  }

  // ── Text / Textarea Input Types ─────────────────────────────────────────────
  if (inputType === 'text' || inputType === 'textarea') {
    if (typeof answer !== 'string') {
      return { success: false, error: 'Answer must be text.' };
    }

    let schema = z.string();

    if (validation.minLength !== undefined) {
      schema = schema.min(
        validation.minLength,
        `Answer must be at least ${validation.minLength} characters.`
      );
    }
    if (validation.maxLength !== undefined) {
      schema = schema.max(
        validation.maxLength,
        `Answer must be at most ${validation.maxLength} characters.`
      );
    }

    if (validation.pattern === 'email') {
      schema = schema.email('Please enter a valid email address.');
    } else if (validation.pattern === 'phone') {
      // Basic phone format validation: 7-20 chars with optional leading +, digits, spaces, hyphens, parens
      const phoneRegex = /^\+?[0-9\s\-()]{7,20}$/;
      schema = schema.regex(phoneRegex, 'Please enter a valid phone number.');
    }

    const res = schema.safeParse(answer);
    if (!res.success) {
      return { success: false, error: res.error.issues[0].message };
    }
    return { success: true, data: res.data };
  }

  // ── Chips Input Type ────────────────────────────────────────────────────────
  if (inputType === 'chips') {
    const isMulti = !!validation.multiSelect;
    const allowedValues = Array.isArray(options)
      ? options.map((opt: any) => String(opt.value))
      : [];

    if (isMulti) {
      if (!Array.isArray(answer)) {
        return { success: false, error: 'Answer must be an array of selections.' };
      }
      if (answer.length === 0 && isRequired) {
        return { success: false, error: 'Please select at least one option.' };
      }
      
      const schema = z.array(
        z.string().refine(val => allowedValues.includes(val), {
          message: 'Selected option is invalid.'
        })
      );

      const res = schema.safeParse(answer.map(String));
      if (!res.success) {
        return { success: false, error: res.error.issues[0].message };
      }
      return { success: true, data: res.data };
    } else {
      if (typeof answer !== 'string' && typeof answer !== 'number') {
        return { success: false, error: 'Answer must be a single selection.' };
      }
      const valStr = String(answer);
      if (!allowedValues.includes(valStr)) {
        return { success: false, error: 'Selected option is invalid.' };
      }
      return { success: true, data: valStr };
    }
  }

  // ── Slider Input Type ───────────────────────────────────────────────────────
  if (inputType === 'slider') {
    let numAnswer: number;
    if (typeof answer === 'number') {
      numAnswer = answer;
    } else if (typeof answer === 'string') {
      numAnswer = Number(answer);
      if (isNaN(numAnswer)) {
        return { success: false, error: 'Answer must be a valid number.' };
      }
    } else {
      return { success: false, error: 'Answer must be a number.' };
    }

    let schema = z.number();
    const minVal = options?.min !== undefined ? Number(options.min) : 0;
    const maxVal = options?.max !== undefined ? Number(options.max) : Infinity;

    schema = schema.min(minVal, `Value must be at least ${minVal}.`);
    schema = schema.max(maxVal, `Value must be at most ${maxVal}.`);

    const res = schema.safeParse(numAnswer);
    if (!res.success) {
      return { success: false, error: res.error.issues[0].message };
    }
    return { success: true, data: res.data };
  }

  return { success: true, data: answer };
}
