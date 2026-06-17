import Link from 'next/link'

interface Props {
  id: string
  modality: string
  targetVariant: string
  createdAt: string
  endCount: number
}

const modalityLabel: Record<string, string> = {
  INDOOR: 'Indoor Round',
  FLINT: 'Flint Round',
}

const variantLabel: Record<string, string> = {
  '1-SPOT': '1 spot',
  '5-SPOT': '5 spot',
  '4-SPOT': '4 spot',
}

export function SessionCard({ id, modality, targetVariant, createdAt, endCount }: Props) {
  const date = new Date(createdAt)
  const formatted = date.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  const totalEnds = modality === 'INDOOR' ? 12 : 7
  const isComplete = endCount >= totalEnds

  return (
    <Link
      href={isComplete ? `/sessions/${id}/summary` : `/sessions/${id}`}
      className="block rounded-xl border border-gray-200 bg-white p-4 hover:border-blue-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-gray-900">{modalityLabel[modality] ?? modality}</p>
          <p className="text-sm text-gray-500 mt-0.5">{formatted}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-xs bg-blue-50 text-blue-700 rounded-full px-2 py-0.5 font-medium">
            {variantLabel[targetVariant] ?? targetVariant}
          </span>
          <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${isComplete ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
            {isComplete ? 'Complete' : `End ${endCount}/${totalEnds}`}
          </span>
        </div>
      </div>
    </Link>
  )
}
