import { useState } from 'react'
import { useGoToDictionary } from '@/hooks/useGoToDictionary'
import { SearchForm } from '@/features/dictionary/components/SearchForm'

/** Dictionary search box on the home page: searching opens the results on the dictionary page. */
export function HomeSearch() {
  const [query, setQuery] = useState('')
  const goToDictionary = useGoToDictionary()

  function handleSearch(raw: string) {
    const word = raw.trim()
    if (word) goToDictionary(word)
  }

  return <SearchForm query={query} onQueryChange={setQuery} onSearch={handleSearch} searching={false} />
}
