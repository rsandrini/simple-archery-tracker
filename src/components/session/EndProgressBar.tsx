interface Props {
  endIndex: number
  totalEnds: number
  arrowIndex: number
  arrowsPerEnd: number
  distance: string
  targetVariant: string
  isWalkUp: boolean
}

export function EndProgressBar({
  endIndex,
  totalEnds,
  arrowIndex,
  arrowsPerEnd,
  distance,
  targetVariant,
  isWalkUp,
}: Props) {
  const dots = Array.from({ length: arrowsPerEnd })

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-gray-800 dark:text-gray-200">
          End {endIndex + 1}
          <span className="text-gray-400 dark:text-gray-500 font-normal"> / {totalEnds}</span>
        </span>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-600 dark:text-gray-400">{distance}</span>
          <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded px-1.5 py-0.5">
            {isWalkUp ? '1-spot' : targetVariant.toLowerCase().replace('-', ' ')}
          </span>
        </div>
      </div>

      <div className="flex gap-1.5 mt-1">
        {dots.map((_, i) => (
          <div
            key={i}
            className={`flex-1 h-2 rounded-full transition-colors ${
              i < arrowIndex
                ? 'bg-blue-500'
                : i === arrowIndex
                ? 'bg-blue-200 dark:bg-blue-700 ring-1 ring-blue-400 dark:ring-blue-500'
                : 'bg-gray-100 dark:bg-gray-700'
            }`}
          />
        ))}
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
        Arrow {arrowIndex + 1} of {arrowsPerEnd}
      </p>
    </div>
  )
}
