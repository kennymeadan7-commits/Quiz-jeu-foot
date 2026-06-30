import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

export type BulletinLine = {
  subject: string
  assessmentType: 'Interrogation' | 'Devoir'
  coefficient: number
  grade: number | null
}

export type BulletinPayload = {
  studentFullName: string
  className: string
  period: string
  average: number | null
  rank: number | null
  missingPolicy: 'ignore' | 'zero'
  signerFullName: string
  lines: BulletinLine[]
}

export function generateBulletinPdf(payload: BulletinPayload): void {
  const doc = new jsPDF()
  // En-tête institutionnel République du Bénin
  doc.setFillColor(0, 135, 81)
  doc.rect(14, 10, 8, 12, 'F')
  doc.setFillColor(252, 209, 22)
  doc.rect(22, 10, 12, 6, 'F')
  doc.setFillColor(232, 17, 45)
  doc.rect(22, 16, 12, 6, 'F')

  doc.setFontSize(10)
  doc.text('REPUBLIQUE DU BENIN', 38, 14)
  doc.text('CEG 5 DOGBO', 38, 20)

  doc.setFontSize(16)
  doc.text('Bulletin scolaire', 14, 30)

  doc.setFontSize(11)
  doc.text(`Eleve : ${payload.studentFullName}`, 14, 40)
  doc.text(`Classe : ${payload.className}`, 14, 47)
  doc.text(`Periode : ${payload.period}`, 14, 54)
  doc.text(
    `Moyenne : ${payload.average === null ? 'N/A' : `${payload.average.toFixed(2)} / 20`}`,
    14,
    61,
  )
  doc.text(`Rang : ${payload.rank ?? 'N/A'}`, 14, 68)
  doc.text(
    `Politique note manquante : ${payload.missingPolicy === 'ignore' ? 'ignore' : 'zero'}`,
    14,
    75,
  )

  autoTable(doc, {
    startY: 82,
    head: [['Matiere', 'Type', 'Coefficient', 'Note']],
    body: payload.lines.map((line) => [
      line.subject,
      line.assessmentType,
      line.coefficient.toString(),
      line.grade === null ? 'Absente' : `${line.grade} / 20`,
    ]),
    styles: { fontSize: 10 },
    headStyles: { fillColor: [15, 23, 42] },
  })

  const lastY = (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 120
  const footerY = Math.min(Math.max(lastY + 20, 230), 265)
  doc.setFontSize(11)
  doc.text('Nom et prenom :', 14, footerY)
  doc.text(payload.signerFullName || '........................................', 50, footerY)
  doc.text('Signature :', 14, footerY + 10)
  doc.text('........................................', 40, footerY + 10)

  const fileName = `bulletin-${payload.studentFullName.toLowerCase().replaceAll(' ', '-')}-${payload.period}.pdf`
  doc.save(fileName)
}
