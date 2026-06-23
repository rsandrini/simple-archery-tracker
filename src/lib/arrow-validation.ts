export function isValidCoordinate(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

export function validateArrowCoords(x: unknown, y: unknown): string | null {
  if (!isValidCoordinate(x) || !isValidCoordinate(y)) {
    return 'x and y must be finite numbers'
  }
  return null
}
