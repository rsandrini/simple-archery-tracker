import type { SpotDef, RingDef } from '@/lib/domain/types'

interface Props {
  spot: SpotDef
  rings: RingDef[]
  background: string
}

export function TargetRings({ spot, rings, background }: Props) {
  const { cx, cy, spotRadius } = spot
  const sorted = [...rings].sort((a, b) => b.outerRadius - a.outerRadius)

  const xRing = rings.find(r => r.score === 'X')
  const xRadius = xRing?.outerRadius ?? 8
  const fontSize = Math.max(2, xRadius * 0.95)
  const textFill = xRing?.fill === '#FFFFFF' ? '#333' : '#FFFFFF'

  return (
    <g>
      {/* Background circle — white stroke for dark backgrounds so the outer ring is visible */}
      <circle cx={cx} cy={cy} r={spotRadius} fill={background} stroke={background === '#FFFFFF' ? '#ccc' : 'white'} strokeWidth={0.5} />
      {/* Rings: outermost first so inner rings paint on top */}
      {sorted.map((ring, i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r={ring.outerRadius}
          fill={ring.fill}
          stroke="#999"
          strokeWidth={0.2}
        />
      ))}
      {/* Border overlays drawn after all fills — ensures visibility against any fill color */}
      {sorted.filter(r => r.strokeColor).map((ring, i) => (
        <circle
          key={`border-${i}`}
          cx={cx}
          cy={cy}
          r={ring.outerRadius}
          fill="none"
          stroke={ring.strokeColor}
          strokeWidth={ring.strokeWidth ?? 0.5}
        />
      ))}
      {/* X marker scaled to the X ring */}
      <text
        x={cx}
        y={cy + fontSize * 0.4}
        textAnchor="middle"
        fontSize={fontSize}
        fill={textFill}
        fontWeight="bold"
        style={{ userSelect: 'none' }}
      >
        X
      </text>
    </g>
  )
}
