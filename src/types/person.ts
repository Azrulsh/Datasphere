export interface Person {
  name: string
  photo: string
  age: number
  country: string
  interest: string
  netWorth: number
}

/** Source column names, including the CSV's surrounding spaces. */
export interface PersonCsvRow {
  Name: string
  Photo: string
  Age: string
  Country: string
  Interest: string
  ' Net Worth ': string
}
