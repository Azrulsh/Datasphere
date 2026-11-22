// Generated indices only: no real or replacement production profile dataset.
export const sheetHeaders = ['Name', 'Photo', 'Age', 'Country', 'Interest', ' Net Worth ']

export function generatedSheetRow(index = 0) {
  return [
    `Generated row ${index}`,
    `https://images.example.test/profile-${index}.jpg`,
    20 + index % 50,
    `Country ${index % 3}`,
    `Interest ${index % 5}`,
    251_260.8 + index,
  ]
}

export function generatedSheetValues(count = 1) {
  return [sheetHeaders, ...Array.from({ length: count }, (_, index) => generatedSheetRow(index))]
}
