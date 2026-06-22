export function MobileBlockedScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-screen text-center px-6 bg-white">
      <svg className="w-10 h-10 text-gray-300 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="6" y="2" width="12" height="20" rx="2" />
        <path d="M11 18h2" strokeLinecap="round" />
      </svg>
      <p className="text-base font-semibold text-gray-800">Not available on mobile</p>
      <p className="text-sm text-gray-500 mt-1.5 max-w-xs">
        Notes can only be viewed on a desktop or laptop browser. Please switch devices to continue.
      </p>
    </div>
  )
}