import { GraduationCap, LayoutDashboard, NotebookText, Search, StickyNote } from 'lucide-react'

/** Main sections for regular (non-admin) users. */
export const NAV_ITEMS = [
  { to: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { to: '/flashcards', labelKey: 'nav.flashcards', icon: GraduationCap },
  { to: '/dictionary', labelKey: 'nav.dictionary', icon: Search },
  { to: '/notebooks', labelKey: 'nav.notebooks', icon: NotebookText },
  { to: '/my-notes', labelKey: 'nav.myNotes', icon: StickyNote },
]
