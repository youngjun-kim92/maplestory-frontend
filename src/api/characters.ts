import client from './client'
import type { CharacterRequest, CharacterROI, CharacterStatsResponse, MapleCharacter } from '../types'

export const charactersApi = {
  createCharacter: (data: CharacterRequest) =>
    client.post<MapleCharacter>('/characters', data),

  getCharacters: () =>
    client.get<MapleCharacter[]>('/characters'),

  updateCharacter: (id: number, data: CharacterRequest) =>
    client.put<MapleCharacter>(`/characters/${id}`, data),

  deleteCharacter: (id: number) =>
    client.delete(`/characters/${id}`),

  getCharacterROI: (id: number) =>
    client.get<CharacterROI>(`/characters/${id}/roi`),

  bulkCreateCharacters: (data: CharacterRequest[]) =>
    client.post<MapleCharacter[]>('/characters/bulk', data),

  getCharacterStats: () =>
    client.get<CharacterStatsResponse[]>('/characters/stats'),
}
