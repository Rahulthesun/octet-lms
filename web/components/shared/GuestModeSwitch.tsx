'use client'

// components/shared/GuestModeSwitch.tsx
//
// The single toggle control used to enter AND exit admin Guest Mode. Reused
// as-is in both AdminSidebar (turns it on) and the student layout's guest
// bar (turns it off), so the control never "disappears" — it just moves
// with you and always reflects the current state.
//
// `variant="onDark"` swaps the track/thumb colors for use on a solid
// primary-colored background (the student-layout guest bar) so the switch
// stays visibly distinct from its background instead of blending into it.

interface GuestModeSwitchProps {
  checked: boolean
  onChange: () => void
  className?: string
  variant?: 'default' | 'onDark'
}

export default function GuestModeSwitch({ checked, onChange, className = '', variant = 'default' }: GuestModeSwitchProps) {
  const trackClass =
    variant === 'onDark'
      ? checked
        ? 'bg-white'
        : 'bg-white/30'
      : checked
        ? 'bg-primary'
        : 'bg-gray-300'

  const thumbClass = variant === 'onDark' && checked ? 'bg-primary' : 'bg-white'

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label="Toggle guest mode"
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 ${trackClass} ${className}`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full transition-transform duration-200 ${thumbClass} ${
          checked ? 'translate-x-[18px]' : 'translate-x-[2px]'
        }`}
      />
    </button>
  )
}
