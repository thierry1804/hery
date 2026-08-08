import type { PrescribedItem } from '../../db/schema';

export function formatPrescription(item: PrescribedItem): string {
  let prescription = '';

  if (item.sets != null && item.repsTarget != null) {
    prescription = `${item.sets}×${item.repsTarget}`;
  } else if (
    item.sets != null &&
    item.repsRangeMin != null &&
    item.repsRangeMax != null
  ) {
    prescription = `${item.sets}×${item.repsRangeMin}–${item.repsRangeMax}`;
  } else if (item.durationSec != null) {
    prescription =
      item.durationSec >= 60 ? `${item.durationSec / 60} min` : `${item.durationSec} s`;
  }

  if (item.restSec > 0 && item.kind !== 'warmup') {
    prescription += `${prescription ? ' · ' : ''}${item.restSec} s`;
  }

  return prescription;
}
