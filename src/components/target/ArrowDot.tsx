import { ARROW_DOT_RADIUS } from '@/lib/domain/target'

interface Props {
  x: number
  y: number
  label?: string
  color?: string
  dotRadius?: number
}

export function ArrowDot({ x, y, label, color = '#FF4136', dotRadius = ARROW_DOT_RADIUS }: Props) {
  const r = dotRadius
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={color} />
      {label && (
        <text
          x={x}
          y={y}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={Math.max(r, 4)}
          fontWeight="bold"
          fill="white"
          stroke="rgba(0,0,0,0.4)"
          strokeWidth={0.4}
          paintOrder="stroke"
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {label}
        </text>
      )}
    </g>
  )
}
