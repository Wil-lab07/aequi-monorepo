import { formatUnits } from 'viem'

export const parseAmountToUnits = (value: string, decimals: number): bigint => {
  const trimmed = value.trim()
  if (!trimmed) {
    throw new Error('Amount is required')
  }

  if (!/^(\d+)(\.\d+)?$/.test(trimmed)) {
    throw new Error('Amount must be a positive number')
  }

  const [whole, fraction = ''] = trimmed.split('.')
  if (fraction.length > decimals) {
    throw new Error(`Amount supports up to ${decimals} decimal places`)
  }

  const normalizedFraction = fraction.padEnd(decimals, '0')
  const normalized = `${whole}${normalizedFraction}`.replace(/^0+/, '')
  const units = normalized.length ? normalized : '0'

  return BigInt(units)
}

export const formatAmountFromUnits = (value: bigint, decimals: number): string => {
  return formatUnits(value, decimals)
}

export const defaultAmountForDecimals = (decimals: number): bigint => {
  if (decimals < 0) {
    return 1n
  }
  return 10n ** BigInt(decimals)
}

export const descaleFromQ18 = (value: bigint, decimals: number): bigint => {
  if (decimals === 18) {
    return value
  }
  if (decimals > 18) {
    const multiplier = 10n ** BigInt(decimals - 18)
    return value * multiplier
  }
  const divisor = 10n ** BigInt(18 - decimals)
  return value / divisor
}
