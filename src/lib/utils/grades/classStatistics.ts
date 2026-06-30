import type { ClassStatistics, RankedStudent } from '@/types/grades';

/**
 * Calcule les statistiques globales d'une classe à partir des élèves classés.
 */
export function computeClassStatistics(
  classId: string,
  rankedStudents: RankedStudent[],
): ClassStatistics {
  const averages = rankedStudents
    .map((s) => s.average)
    .filter((a): a is number => a !== null);

  const classAverage =
    averages.length > 0
      ? Math.round(
          (averages.reduce((sum, a) => sum + a, 0) / averages.length) * 100,
        ) / 100
      : null;

  return {
    classId,
    classAverage,
    highestAverage: averages.length > 0 ? Math.max(...averages) : null,
    lowestAverage: averages.length > 0 ? Math.min(...averages) : null,
    studentCount: rankedStudents.length,
    rankedStudents,
  };
}
