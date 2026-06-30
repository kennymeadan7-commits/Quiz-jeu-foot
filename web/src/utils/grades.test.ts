import { describe, expect, it } from 'vitest'
import { calculerMoyenneGenerale, calculerMoyenneMatiere, type MoyenneMatiere, type Note } from './grades'

describe('calculerMoyenneMatiere', () => {
  it('retourne null si aucune note', () => {
    expect(calculerMoyenneMatiere([])).toBeNull()
  })

  it('calcule avec interros + 2 devoirs', () => {
    const notes: Note[] = [
      { valeur: 10, type: 'interro' },
      { valeur: 14, type: 'interro' },
      { valeur: 12, type: 'devoir' },
      { valeur: 15, type: 'devoir' },
    ]
    // moyenne interros = 12 => (12 + 12 + 15) / 3 = 13
    expect(calculerMoyenneMatiere(notes)).toBe(13)
  })

  it('retourne une valeur partielle si un seul devoir', () => {
    const notes: Note[] = [
      { valeur: 8, type: 'interro' },
      { valeur: 12, type: 'interro' },
      { valeur: 10, type: 'devoir' },
    ]
    // moyenne interros = 10 ; composantes disponibles = [10,10] => 10
    expect(calculerMoyenneMatiere(notes)).toBe(10)
  })

  it('retourne une valeur partielle si seulement des interros', () => {
    const notes: Note[] = [
      { valeur: 9, type: 'interro' },
      { valeur: 12, type: 'interro' },
      { valeur: 15, type: 'interro' },
    ]
    expect(calculerMoyenneMatiere(notes)).toBe(12)
  })

  it('retourne une valeur partielle si seulement des devoirs', () => {
    const notes: Note[] = [
      { valeur: 11, type: 'devoir' },
      { valeur: 13, type: 'devoir' },
    ]
    expect(calculerMoyenneMatiere(notes)).toBe(12)
  })

  it('ignore les notes invalides et conserve un arrondi à 2 décimales', () => {
    const notes: Note[] = [
      { valeur: 10, type: 'interro' },
      { valeur: 10.015, type: 'devoir' },
      { valeur: 22, type: 'devoir' }, // invalide
    ]
    const resultat = calculerMoyenneMatiere(notes)
    expect(resultat).toBe(10.01)
  })
})

describe('calculerMoyenneGenerale', () => {
  it('retourne null si aucune matière', () => {
    expect(calculerMoyenneGenerale([])).toBeNull()
  })

  it('retourne null si aucune matière valide', () => {
    const matieres: MoyenneMatiere[] = [
      { moyenne: null, coefficient: 2 },
      { moyenne: null, coefficient: 0 },
    ]
    expect(calculerMoyenneGenerale(matieres)).toBeNull()
  })

  it('calcule la moyenne générale pondérée', () => {
    const matieres: MoyenneMatiere[] = [
      { moyenne: 12, coefficient: 4 },
      { moyenne: 10, coefficient: 2 },
      { moyenne: 14, coefficient: 1 },
    ]
    // (12*4 + 10*2 + 14*1) / 7 = 82/7 = 11.714... => 11.71
    expect(calculerMoyenneGenerale(matieres)).toBe(11.71)
  })

  it('ignore les matières invalides (coef <= 0 ou moyenne null)', () => {
    const matieres: MoyenneMatiere[] = [
      { moyenne: 15, coefficient: 0 },
      { moyenne: null, coefficient: 3 },
      { moyenne: 13, coefficient: 2 },
    ]
    expect(calculerMoyenneGenerale(matieres)).toBe(13)
  })
})
