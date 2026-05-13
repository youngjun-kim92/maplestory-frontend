import client from './client'

export type FavoriteType = 'BOSS' | 'DOPING'

export interface FavoriteItem {
  id: number
  type: FavoriteType
  label: string
  bossName: string | null
  difficulty: string | null
  partySize: number | null
  amount: number | null
  description: string | null
  characterId?: number | null
  createdAt: string
}

export interface FavoriteRequest {
  type: FavoriteType
  label: string
  bossName?: string | null
  difficulty?: string | null
  partySize?: number | null
  amount?: number | null
  description?: string | null
  characterId?: number | null
}

export const favoritesApi = {
  getAllFavorites: () =>
    client.get<FavoriteItem[]>('/favorites'),

  getAll: (type: FavoriteType, params?: { bossName?: string; characterId?: number }) =>
    client.get<FavoriteItem[]>('/favorites', {
      params: { type, ...params },
    }),

  create: (data: FavoriteRequest) =>
    client.post<FavoriteItem>('/favorites', data),

  delete: (id: number) =>
    client.delete(`/favorites/${id}`),
}
