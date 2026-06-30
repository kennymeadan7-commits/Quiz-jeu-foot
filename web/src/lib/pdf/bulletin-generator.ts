import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

export type BulletinLine = {
  subject: string
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
  lines: BulletinLine[]
}

export function generateBulletinPdf(payload: BulletinPayload): void {
  const doc = new jsPDF()
  doc.setFontSize(16)
  doc.text('Bulletin scolaire', 14, 16)

  doc.setFontSize(11)
  doc.text(`Eleve : ${payload.studentFullName}`, 14, 26)
  doc.text(`Classe : ${payload.className}`, 14, 33)
  doc.text(`Periode : ${payload.period}`, 14, 40)
  doc.text(
    `Moyenne : ${payload.average === null ? 'N/A' : `${payload.average.toFixed(2)} / 20`}`,
    14,
    47,
  )
  doc.text(`Rang : ${payload.rank ?? 'N/A'}`, 14, 54)
  doc.text(
    `Politique note manquante : ${payload.missingPolicy === 'ignore' ? 'ignore' : 'zero'}`,
    14,
    61,
  )

  autoTable(doc, {
    startY: 68,
    head: [['Matiere', 'Coefficient', 'Note']],
    body: payload.lines.map((line) => [
      line.subject,
      line.coefficient.toString(),
      line.grade === null ? 'Absente' : `${line.grade} / 20`,
    ]),
    styles: { fontSize: 10 },
    headStyles: { fillColor: [15, 23, 42] },
  })

  const fileName = `bulletin-${payload.studentFullName.toLowerCase().replaceAll(' ', '-')}-${payload.period}.pdf`
  doc.save(fileName)
}
