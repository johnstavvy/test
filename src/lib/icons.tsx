type IconProps = { className?: string }

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export function IconHome({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6 10v9.5a.5.5 0 0 0 .5.5H10v-5a2 2 0 0 1 4 0v5h3.5a.5.5 0 0 0 .5-.5V10" />
    </svg>
  )
}

export function IconList({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <line x1="7.5" y1="8" x2="16.5" y2="8" />
      <line x1="7.5" y1="12" x2="16.5" y2="12" />
      <line x1="7.5" y1="16" x2="13" y2="16" />
    </svg>
  )
}

export function IconScan({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8.2 7 9.6 4.9a1 1 0 0 1 .8-.4h3.2a1 1 0 0 1 .8.4L15.8 7" />
      <circle cx="12" cy="13.5" r="3.2" />
    </svg>
  )
}

export function IconChart({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <line x1="5" y1="20" x2="5" y2="12" />
      <line x1="12" y1="20" x2="12" y2="6" />
      <line x1="19" y1="20" x2="19" y2="15" />
      <line x1="3" y1="20.5" x2="21" y2="20.5" />
    </svg>
  )
}

export function IconWallet({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M20 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
      <path d="M14 12h6a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-6a2 2 0 0 1 0-4Z" />
    </svg>
  )
}

export function IconSettings({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 2 20.5 7V17L12 22L3.5 17V7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

export function IconReceipt({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M6 3h12v16.5l-1.5-1-1.5 1-1.5-1-1.5 1-1.5-1-1.5 1-1.5-1-1.5 1V3Z" />
      <line x1="8.5" y1="7.5" x2="15.5" y2="7.5" />
      <line x1="8.5" y1="11" x2="15.5" y2="11" />
      <line x1="8.5" y1="14.5" x2="12.5" y2="14.5" />
    </svg>
  )
}

export function IconSearch({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <line x1="15.5" y1="15.5" x2="20" y2="20" />
    </svg>
  )
}

export function IconCar({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M5 15.5 6.4 10a2 2 0 0 1 1.9-1.4h7.4A2 2 0 0 1 17.6 10L19 15.5" />
      <rect x="3.5" y="15.5" width="17" height="3.5" rx="1.2" />
      <circle cx="7.5" cy="19" r="1.3" />
      <circle cx="16.5" cy="19" r="1.3" />
    </svg>
  )
}

export function IconTv({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="3.5" y="5" width="17" height="12" rx="2" />
      <line x1="9" y1="20.5" x2="15" y2="20.5" />
      <line x1="12" y1="17" x2="12" y2="20.5" />
    </svg>
  )
}

export function IconAlertTriangle({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 4.2 21 19.5H3Z" />
      <line x1="12" y1="10" x2="12" y2="14.2" />
      <line x1="12" y1="16.8" x2="12" y2="16.81" />
    </svg>
  )
}

export function IconClose({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  )
}

export function IconCheck({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M5 12.5 10 17.5 19 7" />
    </svg>
  )
}

export function IconPencil({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M14.5 5.5 18.5 9.5 8 20H4v-4Z" />
      <line x1="13" y1="7" x2="17" y2="11" />
    </svg>
  )
}

export function IconFlash({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M13 3 5 13.5h5.5L11 21l8-11h-5.5Z" />
    </svg>
  )
}

export function IconChevronDown({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M5 9 12 16 19 9" />
    </svg>
  )
}
