const MAX_HISTORY = 20

export function getHistory(key: string): string[] {
  try {
    const raw = localStorage.getItem(`autocomplete_${key}`)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

export function saveToHistory(key: string, value: string): void {
  const trimmed = value.trim()
  if (!trimmed) return
  const existing = getHistory(key).filter((v) => v !== trimmed)
  const updated = [trimmed, ...existing].slice(0, MAX_HISTORY)
  localStorage.setItem(`autocomplete_${key}`, JSON.stringify(updated))
}

export function removeFromHistory(key: string, value: string): void {
  const updated = getHistory(key).filter((v) => v !== value)
  localStorage.setItem(`autocomplete_${key}`, JSON.stringify(updated))
}
