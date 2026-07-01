import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

export type BulletinLine = {
  subject: string
  coefficient: number
  interroAverage: number | null
  devoir1: number | null
  devoir2: number | null
  composition: number | null
  subjectAverage: number | null
  total: number | null
  rank?: string
  appreciation?: string
  visa?: string
}

export type BulletinPayload = {
  studentFullName: string
  className: string
  period: string
  schoolYear: string
  average: number | null
  rank: number | null
  missingPolicy: 'ignore' | 'zero'
  signerFullName: string
  lines: BulletinLine[]
  classSize?: number
  classAverage?: number | null
  classBestAverage?: number | null
  classLowestAverage?: number | null
  classAboveAverageCount?: number
  absences?: number
  retards?: number
  recapSem1?: number | null
  recapSem2?: number | null
  recapAnnual?: number | null
}

export function generateBulletinPdf(payload: BulletinPayload): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const fmt = (value: number | null | undefined): string => (value === null || value === undefined ? '-' : value.toFixed(2))
  const totalWeighted = payload.lines.reduce((sum, line) => sum + (line.total ?? 0), 0)

  doc.setFont('times', 'normal')
  doc.setFontSize(10)
  doc.setDrawColor(31, 41, 55)
  doc.setTextColor(17, 24, 39)

  // Cadre global du document
  doc.rect(8, 8, 194, 281)

  // En-tete
  doc.rect(10, 10, 120, 18)
  doc.rect(130, 10, 70, 18)
  doc.setFont('times', 'bold')
  doc.text('REPUBLIQUE DU BENIN', 12, 15)
  doc.setFont('times', 'normal')
  doc.text('MINISTERE DES ENSEIGNEMENTS SECONDAIRES', 12, 19.5)
  doc.text('CEG 5 DOGBO', 12, 24)
  doc.setFont('times', 'bold')
  doc.setFontSize(14)
  doc.text('BULLETIN DE NOTES', 165, 18, { align: 'center' })
  doc.setFontSize(10)
  doc.setFont('times', 'normal')
  doc.text(`Annee scolaire : ${payload.schoolYear}`, 165, 23, { align: 'center' })

  // Trois zones sous en-tete
  doc.rect(10, 30, 80, 24)
  doc.rect(90, 30, 30, 24)
  doc.rect(120, 30, 80, 24)
  doc.setFont('times', 'bold')
  doc.text("IDENTITE DE L'ELEVE", 12, 35)
  doc.setFont('times', 'normal')
  doc.text(`Nom et prenoms: ${payload.studentFullName}`, 12, 40)
  doc.text(`Classe: ${payload.className}`, 12, 45)
  doc.text(`Periode: ${payload.period}`, 12, 50)

  // Mini drapeau centre
  doc.setFillColor(0, 135, 81)
  doc.rect(94, 35, 8, 14, 'F')
  doc.setFillColor(252, 209, 22)
  doc.rect(102, 35, 14, 7, 'F')
  doc.setFillColor(232, 17, 45)
  doc.rect(102, 42, 14, 7, 'F')

  doc.setFont('times', 'bold')
  doc.text('SITUATION DE LA CLASSE', 122, 35)
  doc.setFont('times', 'normal')
  doc.text(`Effectif: ${payload.classSize ?? '-'}`, 122, 40)
  doc.text(`Moyenne classe: ${fmt(payload.classAverage)}`, 122, 45)
  doc.text(`Eleves >= 10: ${payload.classAboveAverageCount ?? '-'}`, 122, 50)

  const tableRows = payload.lines.map((line) => [
    line.subject,
    line.interroAverage === null ? '-' : line.interroAverage.toFixed(2),
    line.devoir1 === null ? '-' : line.devoir1.toFixed(2),
    line.devoir2 === null ? '-' : line.devoir2.toFixed(2),
    line.subjectAverage === null ? '-' : line.subjectAverage.toFixed(2),
    line.coefficient.toFixed(1),
    line.total === null ? '-' : line.total.toFixed(2),
    line.rank ?? '-',
    line.appreciation ?? '',
    line.visa ?? '',
  ])

  tableRows.push(['TOTAL', '', '', '', '', '', totalWeighted.toFixed(2), '', '', ''])
  tableRows.push(['MOYENNE', '', '', '', '', '', payload.average === null ? '-' : payload.average.toFixed(2), '', '', ''])

  autoTable(doc, {
    startY: 56,
    head: [['Matiere', 'Moy Inter', 'Dev1', 'Dev2', 'Moi/20', 'Coef.', 'Moy. Coeff', 'Rang', 'Apprec.', 'Visa']],
    body: tableRows,
    theme: 'grid',
    styles: {
      font: 'times',
      fontSize: 8.5,
      cellPadding: 1.5,
      lineColor: [31, 41, 55],
      lineWidth: 0.15,
      halign: 'center',
      textColor: [17, 24, 39],
    },
    headStyles: { fillColor: [229, 231, 235], textColor: [17, 24, 39], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { halign: 'left', cellWidth: 26 },
      1: { cellWidth: 16 },
      2: { cellWidth: 12 },
      3: { cellWidth: 12 },
      4: { cellWidth: 12 },
      5: { cellWidth: 10 },
      6: { cellWidth: 16 },
      7: { cellWidth: 10 },
      8: { cellWidth: 16 },
      9: { cellWidth: 10 },
    },
    didParseCell: (hookData) => {
      const rowIndex = hookData.row.index
      if (rowIndex >= payload.lines.length) {
        hookData.cell.styles.fontStyle = 'bold'
        hookData.cell.styles.fillColor = [243, 244, 246]
      }
    },
  })

  const afterTableY = (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 170
  const blocksY = afterTableY + 2

  // Trois blocs statistiques
  doc.rect(10, blocksY, 63, 24)
  doc.rect(73, blocksY, 63, 24)
  doc.rect(136, blocksY, 64, 24)
  doc.setFont('times', 'bold')
  doc.text('PROFIL DE LA CLASSE', 12, blocksY + 5)
  doc.text('DISCIPLINE', 75, blocksY + 5)
  doc.text("RESULTATS DE L'ELEVE", 138, blocksY + 5)
  doc.setFont('times', 'normal')
  doc.text(`Moy. classe: ${fmt(payload.classAverage)}`, 12, blocksY + 10)
  doc.text(`Meilleure: ${fmt(payload.classBestAverage)}`, 12, blocksY + 15)
  doc.text(`Plus faible: ${fmt(payload.classLowestAverage)}`, 12, blocksY + 20)

  doc.text(`Absences: ${payload.absences ?? 0}`, 75, blocksY + 10)
  doc.text(`Retards: ${payload.retards ?? 0}`, 75, blocksY + 15)

  doc.text(`Moyenne: ${fmt(payload.average)} / 20`, 138, blocksY + 10)
  doc.text(`Rang: ${payload.rank ?? '-'}`, 138, blocksY + 15)
  doc.text(`Politique: ${payload.missingPolicy === 'ignore' ? 'Ignore' : 'Zero'}`, 138, blocksY + 20)

  // Decisions
  const decisionY = blocksY + 26
  doc.rect(10, decisionY, 190, 18)
  doc.setFont('times', 'bold')
  doc.text('DECISIONS DES CONSEILS DE CLASSE ET DE DISCIPLINE', 12, decisionY + 5)
  doc.setFont('times', 'normal')
  doc.rect(12, decisionY + 8, 3, 3)
  doc.text('Passage', 17, decisionY + 10.5)
  doc.rect(52, decisionY + 8, 3, 3)
  doc.text('Redoublement', 57, decisionY + 10.5)
  doc.rect(102, decisionY + 8, 3, 3)
  doc.text('Avertissement', 107, decisionY + 10.5)
  doc.rect(152, decisionY + 8, 3, 3)
  doc.text('Exclusion', 157, decisionY + 10.5)

  // Recap + visa
  const footerY = decisionY + 20
  doc.rect(10, footerY, 95, 24)
  doc.rect(105, footerY, 95, 24)
  doc.setFont('times', 'bold')
  doc.text('RECAP DES RESULTATS', 12, footerY + 5)
  doc.setFont('times', 'normal')
  doc.text(`Moy. Sem1: ${fmt(payload.recapSem1)}`, 12, footerY + 11)
  doc.text(`Moy. Sem2: ${fmt(payload.recapSem2)}`, 12, footerY + 16)
  doc.text(`Moy. Annuelle: ${fmt(payload.recapAnnual)}`, 12, footerY + 21)

  doc.setFont('times', 'bold')
  doc.text("VISA DU CHEF D'ETABLISSEMENT", 107, footerY + 5)
  doc.setFont('times', 'normal')
  doc.text(`Nom et prenom: ${payload.signerFullName || '............................'}`, 107, footerY + 12)
  doc.text('Signature et cachet:', 107, footerY + 20)

  const fileName = `bulletin-${payload.studentFullName.toLowerCase().replaceAll(' ', '-')}-${payload.period}.pdf`
  doc.save(fileName)
}
