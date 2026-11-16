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

export const LyricsIcon = (props) => (
  <Svg {...props}>
    <path d="M4 5h16v2H4zM4 9h16v2H4zM4 13h10v2H4zM4 17h7v2H4z" />
  </Svg>
)

export const HomeIcon = (props) => (
  <Svg {...props}>
    <path d="M12 3 3 10.5V21h6v-6h6v6h6V10.5L12 3z" />
  </Svg>
)

export const SearchIcon = (props) => (
  <Svg {...props}>
    <path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
  </Svg>
)

export const HeartFilledIcon = (props) => (
  <Svg {...props}>
    <path d="m12 21-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.18L12 21z" />
  </Svg>
)

export const LibraryIcon = (props) => (
  <Svg {...props}>
    <path d="M4 6h2v14H4zM8 6h2v14H8zM12.5 6.6l1.9-.5 3.6 13.4-1.9.5z" />
    <path d="M4 3h16v2H4z" />
  </Svg>
)

export const UserIcon = (props) => (
  <Svg {...props}>
    <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
  </Svg>
)

export const ShieldIcon = (props) => (
  <Svg {...props}>
    <path d="M12 2 4 5v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V5l-8-3z" />
  </Svg>
)

export const PlusIcon = (props) => (
  <Svg {...props}>
    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
  </Svg>
)
