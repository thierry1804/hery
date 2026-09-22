import type { ExerciseProgressionMemory } from '../db/schema';

export type AppreciationTone = 'positive' | 'neutral' | 'caution';

export interface SessionAppreciation {
  tone: AppreciationTone;
  headline: string;
  advice: string;
}

interface StatusLine {
  status: ExerciseProgressionMemory['status'];
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count > 1 ? 's' : ''}`;
}

/**
 * Verdict global de fin de seance, calcule avant le detail exercice par exercice : une
 * direction/un conseil unique a partir de la repartition des statuts coach.
 * Priorite : vigilance (douleur/donnees non fiables) > fatigue dominante > progression > stable.
 */
export function summarizeSessionAppreciation(lines: StatusLine[]): SessionAppreciation | null {
  if (lines.length === 0) return null;

  const counts = { increase: 0, hold: 0, decrease: 0, repeat: 0, watch: 0 };
  for (const line of lines) counts[line.status]++;

  if (counts.watch > 0) {
    return {
      tone: 'caution',
      headline: 'Signal à surveiller',
      advice:
        `Le coach a repéré ${plural(counts.watch, 'exercice')} où la donnée n’est pas assez fiable ` +
        `ou où une douleur récente a été signalée. Pas d’augmentation de charge tant que ce signal ` +
        `persiste : laisse le corps récupérer avant de repousser tes limites. Si la douleur revient ` +
        `sur plusieurs séances, mieux vaut en parler à un professionnel de santé plutôt que de forcer.`,
    };
  }

  if (counts.decrease > counts.increase) {
    return {
      tone: 'caution',
      headline: 'Séance marquée par la fatigue',
      advice:
        `${plural(counts.decrease, 'exercice')} verront leur charge réduite à la prochaine séance. ` +
        `C’est une adaptation normale après une période intense, pas un recul. Profite des prochains ` +
        `jours pour bien récupérer — sommeil, hydratation, nutrition — avant de repousser à nouveau tes ` +
        `charges : c’est cette régularité qui construit la progression sur la durée.`,
    };
  }

  if (counts.increase > 0) {
    return {
      tone: 'positive',
      headline: 'Séance solide',
      advice:
        `Le coach valide une progression sur ${plural(counts.increase, 'exercice')} : tes efforts ` +
        `paient. Continue sur cette lancée à la prochaine séance, en gardant un œil sur tes sensations ` +
        `pour rester dans la bonne zone d’effort — mieux vaut une progression tenue dans la durée qu’un ` +
        `à-coup suivi d’une blessure.`,
    };
  }

  return {
    tone: 'neutral',
    headline: 'Séance stable',
    advice:
      'Rien à changer pour l’instant : tu maintiens ton niveau actuel sur les exercices travaillés. ' +
      'Ce n’est ni un recul ni un bond en avant — la régularité paie aussi, garde ce rythme et la ' +
      'progression reviendra naturellement sur les prochaines séances.',
  };
}
