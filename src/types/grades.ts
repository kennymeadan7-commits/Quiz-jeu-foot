import type { MissingGradeStrategy } from './database';

/** Note enrichie avec le coefficient de la matière (pour le calcul) */
export interface GradeWithCoefficient {
  value: number | null;
  coefficient: number;
  subjectId: string;
  subjectName?: string;
}

/** Résultat du calcul de moyenne pour un élève */
export interface StudentAverageResult {
  studentId: string;
  average: number | null;
  totalCoefficients: number;
  gradedSubjectsCount: number;
  missingSubjectsCount: number;
  strategy: MissingGradeStrategy;
}

/** Élève classé avec sa moyenne */
export interface RankedStudent {
  studentId: string;
  firstName: string;
  lastName: string;
  average: number | null;
  rank: number | null;
}

/** Statistiques de classe */
export interface ClassStatistics {
  classId: string;
  classAverage: number | null;
  highestAverage: number | null;
  lowestAverage: number | null;
  studentCount: number;
  rankedStudents: RankedStudent[];
}
