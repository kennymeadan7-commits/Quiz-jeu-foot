import type { MissingGradeStrategy } from '@/types';
import type { GradeWithCoefficient, StudentAverageResult } from '@/types/grades';

const MAX_SCORE = 20;

/**
 * Valide qu'une note est dans la plage autorisée (0–20).
 */
export function isValidGrade(value: number): boolean {
  return value >= 0 && value <= MAX_SCORE;
}

/**
 * Calcule la moyenne pondérée d'un élève.
 *
 * @param grades - Notes avec coefficients associés
 * @param strategy - 'exclude' ignore les notes manquantes ; 'zero' les compte comme 0
 */
export function calculateStudentAverage(
  studentId: string,
  grades: GradeWithCoefficient[],
  strategy: MissingGradeStrategy = 'exclude',
): StudentAverageResult {
  if (grades.length === 0) {
    return {
      studentId,
      average: null,
      totalCoefficients: 0,
      gradedSubjectsCount: 0,
      missingSubjectsCount: 0,
      strategy,
    };
  }

  let weightedSum = 0;
  let totalCoefficients = 0;
  let gradedCount = 0;
  let missingCount = 0;

  for (const grade of grades) {
    if (grade.value === null) {
      missingCount++;
      if (strategy === 'zero') {
        weightedSum += 0;
        totalCoefficients += grade.coefficient;
      }
      continue;
    }

    weightedSum += grade.value * grade.coefficient;
    totalCoefficients += grade.coefficient;
    gradedCount++;
  }

  const average =
    totalCoefficients > 0
      ? Math.round((weightedSum / totalCoefficients) * 100) / 100
      : null;

  return {
    studentId,
    average,
    totalCoefficients,
    gradedSubjectsCount: gradedCount,
    missingSubjectsCount: missingCount,
    strategy,
  };
}

export { MAX_SCORE };
