export type Note = {
  valeur: number
  type: 'interro' | 'devoir'
}

export type MoyenneMatiere = {
  moyenne: number | null
  coefficient: number
}

function arrondirDeuxDecimales(valeur: number): number {
  return Math.round((valeur + Number.EPSILON) * 100) / 100
}

function estNoteValide(note: Note): boolean {
  return Number.isFinite(note.valeur) && note.valeur >= 0 && note.valeur <= 20
}

/**
 * Calcule la moyenne finale d'une matière pour un semestre selon la règle:
 * (moyenneInterros + devoir1 + devoir2) / 3
 *
 * Adaptation intelligente:
 * - Si une composante est absente (ex: devoir2 non saisi), le calcul se fait
 *   sur les composantes disponibles.
 * - Si aucune note exploitable n'est présente, retourne null.
 */
export function calculerMoyenneMatiere(notes: Note[]): number | null {
  if (notes.length === 0) return null

  const notesValides = notes.filter(estNoteValide)
  if (notesValides.length === 0) return null

  const interros = notesValides
    .filter((note) => note.type === 'interro')
    .map((note) => note.valeur)

  const devoirs = notesValides
    .filter((note) => note.type === 'devoir')
    .map((note) => note.valeur)
    .slice(0, 2)

  const composantes: number[] = []

  if (interros.length > 0) {
    const moyenneInterros = interros.reduce((acc, valeur) => acc + valeur, 0) / interros.length
    composantes.push(moyenneInterros)
  }

  composantes.push(...devoirs)

  if (composantes.length === 0) return null

  const moyenne = composantes.reduce((acc, valeur) => acc + valeur, 0) / composantes.length
  return arrondirDeuxDecimales(moyenne)
}

/**
 * Calcule la moyenne générale pondérée du semestre.
 * Ignore les matières sans moyenne (null) ou avec coefficient invalide.
 */
export function calculerMoyenneGenerale(moyennesMatieres: MoyenneMatiere[]): number | null {
  if (moyennesMatieres.length === 0) return null

  const matieresValides = moyennesMatieres.filter(
    (matiere) =>
      matiere.moyenne !== null &&
      Number.isFinite(matiere.moyenne) &&
      Number.isFinite(matiere.coefficient) &&
      matiere.coefficient > 0,
  )

  if (matieresValides.length === 0) return null

  const sommePonderee = matieresValides.reduce(
    (acc, matiere) => acc + (matiere.moyenne as number) * matiere.coefficient,
    0,
  )
  const sommeCoefficients = matieresValides.reduce((acc, matiere) => acc + matiere.coefficient, 0)

  if (sommeCoefficients === 0) return null

  return arrondirDeuxDecimales(sommePonderee / sommeCoefficients)
}
