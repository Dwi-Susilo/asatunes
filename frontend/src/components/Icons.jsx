function Svg({ children, className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      {children}
    </svg>
  )
}

export const PlayIcon = (props) => (
  <Svg {...props}>
    <path d="M8 5v14l11-7z" />
  </Svg>
)

export const PauseIcon = (props) => (
  <Svg {...props}>
    <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
  </Svg>
)

export const PrevIcon = (props) => (
  <Svg {...props}>
    <path d="M6 6h2v12H6zM9.5 12 18 18V6z" />
  </Svg>
)

export const NextIcon = (props) => (
  <Svg {...props}>
    <path d="M16 6h2v12h-2zM6 18l8.5-6L6 6z" />
  </Svg>
)

export const ShuffleIcon = (props) => (
  <Svg {...props}>
    <path d="M10.59 9.17 5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" />
  </Svg>
)

export const RepeatIcon = (props) => (
  <Svg {...props}>
    <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
  </Svg>
)