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
}

export function generateBulletinPdf(payload: BulletinPayload): void {
  const doc = new jsPDF()
  doc.setFont('helvetica', 'normal')

  // En-tête institutionnel (drapeau à gauche, informations à droite)
  doc.setFillColor(0, 135, 81)
  doc.rect(14, 12, 10, 16, 'F')
  doc.setFillColor(252, 209, 22)
  doc.rect(24, 12, 14, 8, 'F')
  doc.setFillColor(232, 17, 45)
  doc.rect(24, 20, 14, 8, 'F')

  doc.setTextColor(15, 23, 42)
  doc.setFontSize(10)
  doc.text('REPUBLIQUE DU BENIN', 44, 17)
  doc.text('MINISTERE DES ENSEIGNEMENTS SECONDAIRES', 44, 22)
  doc.text('CEG 5 DOGBO', 44, 27)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.text('RELEVE DE NOTES SEMESTRIEL', 105, 38, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(`Annee scolaire : ${payload.schoolYear}`, 105, 44, { align: 'center' })

  // Encadré informations élève
  doc.setDrawColor(203, 213, 225)
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(14, 50, 182, 22, 2, 2, 'FD')
  doc.setFontSize(10)
  doc.text(`Eleve : ${payload.studentFullName}`, 18, 58)
  doc.text(`Classe : ${payload.className}`, 18, 65)
  doc.text(`Periode : ${payload.period}`, 110, 58)
  doc.text(
    `Politique note manquante : ${payload.missingPolicy === 'ignore' ? 'Ignoree' : 'Zero'}`,
    110,
    65,
  )

  // Cartes moyenne et rang
  doc.setFillColor(30, 64, 175)
  doc.roundedRect(14, 76, 88, 18, 2, 2, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.text('Moyenne semestrielle', 18, 83)
  doc.setFontSize(12)
  doc.text(payload.average === null ? 'N/A' : `${payload.average.toFixed(2)} / 20`, 18, 90)

  doc.setFillColor(15, 118, 110)
  doc.roundedRect(108, 76, 88, 18, 2, 2, 'F')
  doc.setFontSize(10)
  doc.text('Rang', 112, 83)
  doc.setFontSize(12)
  doc.text(payload.rank === null ? 'N/A' : `${payload.rank}`, 112, 90)
  doc.setTextColor(15, 23, 42)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)

  autoTable(doc, {
    startY: 100,
    head: [['Matiere', 'Moy Inter', 'Dev1', 'Dev2', 'Moi/20', 'Coef.', 'Moy. Coeff', 'Rang', 'Apprec.', 'Visa']],
    body: payload.lines.map((line) => [
      line.subject,
      line.interroAverage === null ? '-' : line.interroAverage.toFixed(2),
      line.devoir1 === null ? '-' : line.devoir1.toFixed(2),
      line.devoir2 === null ? '-' : line.devoir2.toFixed(2),
      line.subjectAverage === null ? '-' : line.subjectAverage.toFixed(2),
      line.coefficient.toString(),
      line.total === null ? '-' : line.total.toFixed(2),
      line.rank ?? '',
      line.appreciation ?? '',
      line.visa ?? '',
    ]),
    styles: { fontSize: 9.5, cellPadding: 2.8, textColor: [15, 23, 42] },
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], halign: 'center' },
    bodyStyles: { halign: 'center' },
    columnStyles: {
      0: { halign: 'left' },
    },
  })

  const lastY = (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 150
  const footerY = Math.min(Math.max(lastY + 18, 235), 268)
  doc.setFontSize(11)
  doc.text('Nom et prenom du responsable :', 14, footerY)
  doc.text(payload.signerFullName || '........................................', 74, footerY)
  doc.text('Signature :', 14, footerY + 10)
  doc.text('........................................', 40, footerY + 10)

  const fileName = `bulletin-${payload.studentFullName.toLowerCase().replaceAll(' ', '-')}-${payload.period}.pdf`
  doc.save(fileName)
}
