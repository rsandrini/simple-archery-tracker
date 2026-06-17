import type { SpotDef, RingDef } from '@/lib/domain/types'

interface Props {
  spot: SpotDef
  rings: RingDef[]
  background: string
}

export function TargetRings({ spot, rings, background }: Props) {
  const { cx, cy, spotRadius } = spot
  const sorted = [...rings].sort((a, b) => b.outerRadius - a.outerRadius)

  return (
    <g>
      {/* Background circle */}
      <circle cx={cx} cy={cy} r={spotRadius} fill={background} stroke="#ccc" strokeWidth={0.5} />
      {/* Rings: outermost first so inner rings paint on top */}
      {sorted.map((ring, i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r={ring.outerRadius}
          fill={ring.fill}
          stroke="#999"
          strokeWidth={0.4}
        />
      ))}
      {/* X marker on center */}
      <text
        x={cx}
        y={cy + 2.5}
        textAnchor="middle"
        fontSize={5}
        fill={sorted[sorted.length - 1]?.fill === '#FFFFFF' ? '#333' : '#FFFFFF'}
        fontWeight="bold"
        style={{ userSelect: 'none' }}
      >
        X
      </text>
    </g>
  )
}
