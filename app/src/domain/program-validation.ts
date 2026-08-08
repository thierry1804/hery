export type ValidationOk = { ok: true };
export type ValidationErr = { ok: false; error: string };
export type ValidationResult = ValidationOk | ValidationErr;

const ok: ValidationOk = { ok: true };

function err(error: string): ValidationErr {
  return { ok: false, error };
}

export function validateDayOfWeek(day: number): ValidationResult {
  if (!Number.isInteger(day) || day < 1 || day > 7) {
    return err('dayOfWeek must be between 1 and 7');
  }
  return ok;
}

type ItemPatchInput = {
  kind: string;
  sets: number | null;
  repsTarget: number | null;
  repsRangeMin: number | null;
  repsRangeMax: number | null;
  durationSec: number | null;
  restSec: number;
};

function validateRestSec(restSec: number): ValidationResult | null {
  if (restSec < 0) {
    return err('restSec must be >= 0');
  }
  return null;
}

function validateStrengthOrCore(input: ItemPatchInput): ValidationResult {
  if (input.sets == null || input.sets < 1) {
    return err('sets must be >= 1');
  }

  const hasTarget = input.repsTarget != null;
  const hasRangeMin = input.repsRangeMin != null;
  const hasRangeMax = input.repsRangeMax != null;
  const hasDuration = input.durationSec != null && input.durationSec > 0;

  if (hasTarget && (hasRangeMin || hasRangeMax)) {
    return err('repsTarget and reps range cannot both be set');
  }

  if (hasTarget) {
    return ok;
  }

  if (hasRangeMin && hasRangeMax) {
    if (input.repsRangeMin! > input.repsRangeMax!) {
      return err('repsRangeMin must be <= repsRangeMax');
    }
    return ok;
  }

  if (hasDuration) {
    return ok;
  }

  return err('repsTarget, reps range (min and max), or durationSec is required');
}

function validateCardio(input: ItemPatchInput): ValidationResult {
  if (input.durationSec == null || input.durationSec <= 0) {
    return err('durationSec must be > 0 for cardio');
  }
  return ok;
}

function validateWarmupOrStretch(input: ItemPatchInput): ValidationResult {
  if (input.durationSec != null && input.durationSec <= 0) {
    return err('durationSec must be > 0 when set');
  }
  return ok;
}

export function validateItemPatch(input: ItemPatchInput): ValidationResult {
  const restErr = validateRestSec(input.restSec);
  if (restErr) return restErr;

  switch (input.kind) {
    case 'strength':
    case 'core':
      return validateStrengthOrCore(input);
    case 'cardio':
      return validateCardio(input);
    case 'warmup':
    case 'stretch':
      return validateWarmupOrStretch(input);
    default:
      return err(`unknown kind: ${input.kind}`);
  }
}
