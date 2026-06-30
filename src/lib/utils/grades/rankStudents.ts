import type { RankedStudent } from '@/types/grades';

interface StudentForRanking {
  studentId: string;
  firstName: string;
  lastName: string;
  average: number | null;
}

/**
 * Classe les élèves par moyenne décroissante.
 * Les élèves sans moyenne (null) sont placés en fin de classement.
 */
export function rankStudents(students: StudentForRanking[]): RankedStudent[] {
  const sorted = [...students].sort((a, b) => {
    if (a.average === null && b.average === null) return 0;
    if (a.average === null) return 1;
    if (b.average === null) return -1;
    return b.average - a.average;
  });

  let currentRank = 0;
  let lastAverage: number | null | undefined;

  return sorted.map((student, index) => {
    if (student.average !== lastAverage) {
      currentRank = index + 1;
      lastAverage = student.average;
    }

    return {
      studentId: student.studentId,
      firstName: student.firstName,
      lastName: student.lastName,
      average: student.average,
      rank: student.average !== null ? currentRank : null,
    };
  });
}
