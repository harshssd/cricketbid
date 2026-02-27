export interface OutcryRule {
  from_multiplier: number
  to_multiplier: number
  increment: number
}

export interface OutcryConfig {
  rules: OutcryRule[]
  timer_seconds: number | null // null = manual close only
}

/**
 * Default IPL-style increment rules.
 * Multiplier = currentBid / basePrice.
 *
 *   1x–2x base  →  +10 (or base price if lower tier)
 *   2x–5x base  →  +25
 *   5x–10x base →  +50
 *   10x+ base   →  +100
 */
export function getDefaultOutcryConfig(): OutcryConfig {
  return {
    rules: [
      { from_multiplier: 0, to_multiplier: 2, increment: 10 },
      { from_multiplier: 2, to_multiplier: 5, increment: 25 },
      { from_multiplier: 5, to_multiplier: 10, increment: 50 },
      { from_multiplier: 10, to_multiplier: 9999, increment: 100 },
    ],
    timer_seconds: 15,
  }
}

/**
 * Calculate the increment for the next bid given current state.
 * Walks the rules array to find the matching multiplier bracket.
 */
export function calculateIncrement(
  currentBid: number,
  basePrice: number,
  config: OutcryConfig
): number {
  if (basePrice <= 0) return basePrice || 1

  const multiplier = currentBid / basePrice

  for (const rule of config.rules) {
    if (multiplier >= rule.from_multiplier && multiplier < rule.to_multiplier) {
      return rule.increment
    }
  }

  // Fallback: use the last rule's increment or base price
  return config.rules.length > 0
    ? config.rules[config.rules.length - 1].increment
    : basePrice
}

/**
 * Calculate the next bid amount after a paddle raise.
 */
export function calculateNextBid(
  currentBid: number,
  basePrice: number,
  config: OutcryConfig
): number {
  return currentBid + calculateIncrement(currentBid, basePrice, config)
}
