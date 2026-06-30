/**
 * Génération de bulletins PDF — à implémenter (jsPDF + jspdf-autotable).
 */
import type { RankedStudent } from '@/types/grades';

export interface ReportCardData {
  schoolName: string;
  className: string;
  periodLabel: string;
  student: RankedStudent;
  subjectGrades: Array<{
    subjectName: string;
    coefficient: number;
    value: number | null;
  }>;
}

export async function generateReportCard(_data: ReportCardData): Promise<Blob> {
  throw new Error('Export PDF non encore implémenté');
}
