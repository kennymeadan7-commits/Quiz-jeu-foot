export type MissingGradePolicy = 'ignore' | 'zero'

export type WeightedGradeInput = {
  grade: number | null
  coefficient: number
}

export function calculateWeightedAverage(
  grades: WeightedGradeInput[],
  missingGradePolicy: MissingGradePolicy = 'ignore',
): number | null {
  let numerator = 0
  let denominator = 0

  for (const item of grades) {
    if (item.coefficient <= 0) continue

    if (item.grade === null) {
      if (missingGradePolicy === 'zero') {
        denominator += item.coefficient
      }
      continue
    }

    numerator += item.grade * item.coefficient
    denominator += item.coefficient
  }

  if (denominator === 0) return null

  return Number((numerator / denominator).toFixed(2))
}
