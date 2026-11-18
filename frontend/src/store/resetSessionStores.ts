import { useDictionaryStore } from './dictionary.store'
import { useReaderStore } from './reader.store'
import { useUIStore } from './ui.store'

/** Forget the screens the previous account left open (notebook, word, searches…) — on logout and login. */
export function resetSessionStores(): void {
  useUIStore.getState().reset()
  useDictionaryStore.getState().reset()
  useReaderStore.getState().reset()
}
