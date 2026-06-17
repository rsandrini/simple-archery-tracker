import { ARROW_DOT_RADIUS } from '@/lib/domain/target'

interface Props {
  x: number
  y: number
  label?: string
  color?: string
}

export function ArrowDot({ x, y, label, color = '#FF4136' }: Props) {
  return (
    <g>
      <circle
        cx={x}
        cy={y}
        r={ARROW_DOT_RADIUS}
        fill={color}
        stroke="white"
        strokeWidth={0.8}
      />
      {label && (
        <text
          x={x}
          y={y - ARROW_DOT_RADIUS - 1.5}
          textAnchor="middle"
          fontSize={4}
          fill="white"
          stroke="#333"
          strokeWidth={0.3}
          paintOrder="stroke"
        >
          {label}
        </text>
      )}
    </g>
  )
}
