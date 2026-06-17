interface Props {
  runningTotal: number
  maxTotal: number
  totalX: number
  endIndex: number
  totalEnds: number
}

export function RunningTotalDisplay({ runningTotal, maxTotal, totalX, endIndex, totalEnds }: Props) {
  const pct = maxTotal > 0 ? (runningTotal / maxTotal) * 100 : 0

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-end justify-between mb-2">
        <span className="text-xs text-gray-500 uppercase tracking-wide">Running total</span>
        <span className="text-xs text-gray-400">End {endIndex + 1} / {totalEnds}</span>
      </div>
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-3xl font-bold text-gray-900">{runningTotal}</span>
        <span className="text-sm text-gray-400">/ {maxTotal}</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-1.5 mb-2">
        <div
          className="bg-blue-500 h-1.5 rounded-full transition-all"
          style={{ width: `${pct.toFixed(1)}%` }}
        />
      </div>
      {totalX > 0 && (
        <p className="text-xs text-yellow-600 font-medium">{totalX}× X</p>
      )}
    </div>
  )
}
