import type { ReactNode } from 'react'
import { useActivePill } from './useActivePill'

// Shared "liquid glass" segmented control — a solid accent pill glides to sit
// behind whichever option is selected, same glide mechanic as the bottom nav's
// active-tab highlight (see useActivePill), just opaque instead of translucent
// since these sit on a solid card background rather than a blurred glass bar.
export function SegmentedControl<T extends string | number | boolean>({
  options,
  value,
  onChange,
  shape = 'rounded',
}: {
  options: { value: T; label: ReactNode }[]
  value: T
  onChange: (value: T) => void
  shape?: 'rounded' | 'pill'
}) {
  const active = useActivePill(String(value), [options.length])
  const segmentClass = shape === 'pill' ? 'rounded-full' : 'rounded-lg'
  const buttonPadding = shape === 'pill' ? 'py-2' : 'py-1.5'
  const buttonWeight = shape === 'pill' ? 'font-semibold' : 'font-medium'

  return (
    <div
      ref={active.containerRef}
      className={`relative flex gap-1 border border-slate-300 bg-white p-1 dark:border-[#3a3e45] dark:bg-[#212327] ${
        shape === 'pill' ? 'rounded-full' : 'rounded-xl'
      }`}
    >
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-y-1 z-0 bg-accent transition-all ease-[cubic-bezier(0.34,1.56,0.64,1)] ${segmentClass} ${
          active.rect ? 'opacity-100 duration-300' : 'opacity-0 duration-0'
        }`}
        style={active.rect ? { left: active.rect.start, width: active.rect.size } : undefined}
      />
      {options.map((option) => (
        <button
          key={String(option.value)}
          ref={active.registerRef(String(option.value))}
          onClick={() => onChange(option.value)}
          className={`relative z-10 flex-1 truncate ${segmentClass} ${buttonPadding} text-sm ${buttonWeight} transition-colors ${
            value === option.value ? 'text-white' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
