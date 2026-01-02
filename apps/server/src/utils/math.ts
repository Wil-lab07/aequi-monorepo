import { Q18 } from '../config/constants'

interface FractionLike {
  numerator: { toString(): string }
  denominator: { toString(): string }
}

export const fractionToQ18 = (fraction: FractionLike): bigint => {
  const numerator = BigInt(fraction.numerator.toString())
  const denominator = BigInt(fraction.denominator.toString())
  if (denominator === 0n) {
    return 0n
  }
  return (numerator * Q18) / denominator
}

export const scaleToQ18 = (amount: bigint, decimals: number): bigint => {
  if (decimals === 18) {
    return amount
  }
  if (decimals > 18) {
    const divisor = 10n ** BigInt(decimals - 18)
    return amount / divisor
  }
  const multiplier = 10n ** BigInt(18 - decimals)
  return amount * multiplier
}

export const multiplyQ18 = (a: bigint, b: bigint): bigint => (a * b) / Q18

export const minBigInt = (...values: bigint[]): bigint =>
  values.reduce((min, value) => (value < min ? value : min))
