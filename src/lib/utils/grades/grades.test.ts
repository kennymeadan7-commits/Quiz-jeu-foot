import { describe, it, expect } from 'vitest';
import { calculateStudentAverage, isValidGrade } from './calculateAverage';
import { rankStudents } from './rankStudents';
import { computeClassStatistics } from './classStatistics';
import type { GradeWithCoefficient } from '@/types/grades';

describe('isValidGrade', () => {
  it('accepte les notes entre 0 et 20', () => {
    expect(isValidGrade(0)).toBe(true);
    expect(isValidGrade(20)).toBe(true);
    expect(isValidGrade(15.5)).toBe(true);
  });

  it('rejette les notes hors plage', () => {
    expect(isValidGrade(-1)).toBe(false);
    expect(isValidGrade(21)).toBe(false);
  });
});

describe('calculateStudentAverage', () => {
  const grades: GradeWithCoefficient[] = [
    { value: 14, coefficient: 3, subjectId: '1' },
    { value: 12, coefficient: 2, subjectId: '2' },
    { value: null, coefficient: 2, subjectId: '3' },
  ];

  it('exclut les notes manquantes (stratégie exclude)', () => {
    const result = calculateStudentAverage('s1', grades, 'exclude');
    // (14*3 + 12*2) / (3+2) = 66/5 = 13.2
    expect(result.average).toBe(13.2);
    expect(result.missingSubjectsCount).toBe(1);
    expect(result.gradedSubjectsCount).toBe(2);
  });

  it('compte les notes manquantes comme 0 (stratégie zero)', () => {
    const result = calculateStudentAverage('s1', grades, 'zero');
    // (14*3 + 12*2 + 0*2) / (3+2+2) = 66/7 ≈ 9.43
    expect(result.average).toBe(9.43);
    expect(result.totalCoefficients).toBe(7);
  });

  it('retourne null si aucune note valide en mode exclude', () => {
    const missing: GradeWithCoefficient[] = [
      { value: null, coefficient: 2, subjectId: '1' },
    ];
    const result = calculateStudentAverage('s1', missing, 'exclude');
    expect(result.average).toBeNull();
  });
});

describe('rankStudents', () => {
  it('classe par moyenne décroissante avec ex-aequo', () => {
    const ranked = rankStudents([
      { studentId: '1', firstName: 'A', lastName: 'X', average: 15 },
      { studentId: '2', firstName: 'B', lastName: 'Y', average: 15 },
      { studentId: '3', firstName: 'C', lastName: 'Z', average: 12 },
    ]);

    expect(ranked[0].rank).toBe(1);
    expect(ranked[1].rank).toBe(1);
    expect(ranked[2].rank).toBe(3);
  });
});

describe('computeClassStatistics', () => {
  it('calcule la moyenne de classe', () => {
    const stats = computeClassStatistics('c1', [
      { studentId: '1', firstName: 'A', lastName: 'X', average: 14, rank: 1 },
      { studentId: '2', firstName: 'B', lastName: 'Y', average: 10, rank: 2 },
    ]);

    expect(stats.classAverage).toBe(12);
    expect(stats.highestAverage).toBe(14);
    expect(stats.lowestAverage).toBe(10);
    expect(stats.studentCount).toBe(2);
  });
});
