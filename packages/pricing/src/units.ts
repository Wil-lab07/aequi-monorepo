export const defaultAmountForDecimals = (decimals: number): bigint => {
  if (decimals < 0) {
    return 0n
  }
  return 10n ** BigInt(decimals)
}
