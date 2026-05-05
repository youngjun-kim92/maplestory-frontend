import client from './client'
import type { CharacterRequest, CharacterROI, CharacterStatsResponse, MapleCharacter } from '../types'

let _cache: MapleCharacter[] | null = null

const bust = () => { _cache = null }

export const charactersApi = {
  getCharacters: async (): Promise<{ data: MapleCharacter[] }> => {
    if (_cache) return { data: _cache }
    const res = await client.get<MapleCharacter[]>('/characters')
    if (res.data.length > 0) _cache = res.data
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

  getCharacterStats: () =>
    client.get<CharacterStatsResponse[]>('/characters/stats'),
}
