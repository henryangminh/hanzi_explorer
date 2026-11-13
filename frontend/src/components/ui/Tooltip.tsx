import { cn } from '@/lib/cn'

type Position = 'bottom' | 'top' | 'left'

/** Instant hover label (no delay, unlike the native `title`). */
export function Tooltip({ text, children, position = 'bottom' }: {
  text: string
  children: React.ReactNode
  position?: Position
}) {
  return (
    <div className="relative group inline-flex justify-center items-center">
      {children}
      <span className={cn(
        'pointer-events-none absolute px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap',
        'bg-gray-800 text-white dark:bg-gray-100 dark:text-black shadow-md',
        'opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-[100]',
        position === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5',
        position === 'left' ? 'right-0' : 'left-1/2 -translate-x-1/2',
      )}>
        {text}
        <span className={cn(
          'absolute border-4 border-transparent',
          position === 'left' ? 'right-2' : 'left-1/2 -translate-x-1/2',
          position === 'top' ? 'top-full border-t-gray-800 dark:border-t-gray-100' : 'bottom-full border-b-gray-800 dark:border-b-gray-100',
        )} />
      </span>
    </div>
  )
}
