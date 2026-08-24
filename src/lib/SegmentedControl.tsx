import type { ReactNode } from 'react'
import { useActivePill } from './useActivePill'

// Shared "liquid glass" segmented control — a fill glides to sit behind whichever
// option is selected, same glide mechanic as the bottom nav's active-tab highlight
// (see useActivePill). `tone="solid"` (opaque accent, white label) is for a
// top-level switch between two different sections (e.g. Budget's Bills/Income);
// `tone="tint"` (accent/15 fill, accent label) is for a switch scoped inside one
// screen (theme, frequency, person), matching the bottom nav's active-tab tint.
export function SegmentedControl<T extends string | number | boolean>({
  options,
  value,
  onChange,
  tone = 'tint',
}: {
  options: { value: T; label: ReactNode }[]
  value: T
  onChange: (value: T) => void
  tone?: 'solid' | 'tint'
}) {
  const active = useActivePill(String(value), [options.length])
  const fillClass = tone === 'solid' ? 'bg-accent' : 'bg-accent/15'
  const activeTextClass = tone === 'solid' ? 'text-white' : 'text-accent'

  return (
    <div
      ref={active.containerRef}
      className="relative flex gap-1 rounded-full border border-slate-200 bg-slate-100 p-1 dark:border-[#1e2027] dark:bg-[#1a1d22]"
    >
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-y-1 z-0 rounded-full ${fillClass} transition-all ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
          active.rect ? 'opacity-100 duration-300' : 'opacity-0 duration-0'
        }`}
        style={active.rect ? { left: active.rect.start, width: active.rect.size } : undefined}
      />
      {options.map((option) => (
        <button
          key={String(option.value)}
          ref={active.registerRef(String(option.value))}
          onClick={() => onChange(option.value)}
          className={`relative z-10 min-w-fit flex-1 truncate rounded-full px-3 py-2 text-sm font-semibold transition-colors ${
            value === option.value ? activeTextClass : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
