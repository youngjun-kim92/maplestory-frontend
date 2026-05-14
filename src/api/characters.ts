import client from './client'
import type { CharacterRequest, CharacterROI, CharacterStatsResponse, MapleCharacter } from '../types'

let _cache: MapleCharacter[] | null = null
let _cacheServerId: string | null = null

export const bustCharacterCache = () => { _cache = null; _cacheServerId = null }

const bust = bustCharacterCache

export const charactersApi = {
  getCharacters: async (): Promise<{ data: MapleCharacter[] }> => {
    const currentServerId = localStorage.getItem('activeServerId')
    if (_cache && _cacheServerId === currentServerId) return { data: _cache }
    const res = await client.get<MapleCharacter[]>('/characters')
    _cache = res.data.length > 0 ? res.data : null
    _cacheServerId = res.data.length > 0 ? currentServerId : null
    return res
  },

  createCharacter: async (data: CharacterRequest) => {
    const res = await client.post<MapleCharacter>('/characters', data)
    bust()
    return res
  },

  updateCharacter: async (id: number, data: CharacterRequest) => {
    const res = await client.put<MapleCharacter>(`/characters/${id}`, data)
    bust()
    return res
  },

  deleteCharacter: async (id: number) => {
    const res = await client.delete(`/characters/${id}`)
    bust()
    return res
  },

  bulkCreateCharacters: async (data: CharacterRequest[]) => {
    const res = await client.post<MapleCharacter[]>('/characters/bulk', data)
    bust()
    return res
  },

  getCharacterROI: (id: number) =>
    client.get<CharacterROI>(`/characters/${id}/roi`),

  getCharacterStats: (weeks?: number) =>
    client.get<CharacterStatsResponse[]>('/characters/stats', { params: weeks ? { weeks } : undefined }),
}
