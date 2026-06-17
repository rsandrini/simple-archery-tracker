import { ARROW_DOT_RADIUS } from '@/lib/domain/target'

interface Props {
  x: number
  y: number
  label?: string
  color?: string
}

export function ArrowDot({ x, y, label, color = '#FF4136' }: Props) {
  const r = label ? ARROW_DOT_RADIUS + 1.5 : ARROW_DOT_RADIUS
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={color} stroke="white" strokeWidth={0.8} />
      {label && (
        <text
          x={x}
          y={y}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={4.5}
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
