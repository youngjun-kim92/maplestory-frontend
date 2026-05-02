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
}

export const favoritesApi = {
  getAll: (type: FavoriteType, bossName?: string) =>
    client.get<FavoriteItem[]>('/favorites', {
      params: bossName ? { type, bossName } : { type },
    }),

  create: (data: FavoriteRequest) =>
    client.post<FavoriteItem>('/favorites', data),

  delete: (id: number) =>
    client.delete(`/favorites/${id}`),
}
