interface Props {
  endIndex: number
  totalEnds: number
  arrowIndex: number
  arrowsPerEnd: number
  distance: string
  targetVariant: string
  isWalkUp: boolean
  currentTotal: number
  maxTotal: number
}

export function EndProgressBar({
  endIndex,
  totalEnds,
  arrowIndex,
  arrowsPerEnd,
  distance,
  targetVariant,
  isWalkUp,
  currentTotal,
  maxTotal,
}: Props) {
  const dots = Array.from({ length: arrowsPerEnd })

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      {/* Row 1: End counter + live score */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-semibold text-gray-800 dark:text-gray-200">
          End {endIndex + 1}
          <span className="text-gray-400 dark:text-gray-500 font-normal"> / {totalEnds}</span>
        </span>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          <span className="text-base font-bold text-blue-600 dark:text-blue-400">{currentTotal}</span>
          {' '}/ {maxTotal}
        </span>
      </div>

      {/* Row 2: Distance · variant · arrow counter — compact single line */}
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
        {distance}
        {' · '}
        {isWalkUp ? '1-spot' : targetVariant.toLowerCase().replace('-', ' ')}
        {' · '}
        Arrow {arrowIndex + 1} of {arrowsPerEnd}
      </p>

      {/* Row 3: Progress dots */}
      <div className="flex gap-1.5">
        {dots.map((_, i) => (
          <div
            key={i}
            className={`flex-1 h-1 rounded-full transition-colors ${
              i < arrowIndex
                ? 'bg-blue-500'
                : i === arrowIndex
                ? 'bg-blue-200 dark:bg-blue-700 ring-1 ring-blue-400 dark:ring-blue-500'
                : 'bg-gray-100 dark:bg-gray-700'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
