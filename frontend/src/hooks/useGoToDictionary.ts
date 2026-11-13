import { useNavigate } from 'react-router-dom'
import { useDictionaryStore } from '@/store/dictionary.store'

/** Open a word in the dictionary page, reusing an existing result tab when there is one. */
export function useGoToDictionary() {
  const navigate = useNavigate()
  const { tabs, setActiveTabId } = useDictionaryStore()

  return (word: string) => {
    const existingTab = tabs.find((t) => t.query === word && t.results.length > 0)
    if (existingTab) {
      setActiveTabId(existingTab.id)
      navigate('/dictionary')
    } else {
      navigate(`/dictionary?q=${encodeURIComponent(word)}`)
    }
  }
}
