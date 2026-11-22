export type NetWorthTier = 'red' | 'orange' | 'green'

export function classifyNetWorth(value: number): NetWorthTier {
  if (!Number.isFinite(value)) throw new RangeError('Net worth must be finite')
  if (value < 100_000) return 'red'
  if (value <= 200_000) return 'orange'
  return 'green'
}

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 2,
})

export function formatNetWorth(value: number): string {
  return usd.format(value)
}
