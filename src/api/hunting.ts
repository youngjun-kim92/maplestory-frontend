import client from './client'
import type { HuntingSession, HuntingSessionRequest, HuntingStats } from '../types'

export const huntingApi = {
  recordSession: (data: HuntingSessionRequest) =>
    client.post<HuntingSession>('/hunting/session', data),

  getWeeklySessions: (params?: { week?: string; characterId?: number }) =>
    client.get<HuntingSession[]>('/hunting/sessions', { params }),

  updateSession: (id: number, data: { income: number; solErdaFragments?: number; sessionDate: string }) =>
    client.patch<HuntingSession>(`/hunting/sessions/${id}`, data),

  deleteSession: (id: number) =>
    client.delete(`/hunting/sessions/${id}`),

  getHuntingStats: () =>
    client.get<HuntingStats[]>('/hunting/stats'),
}
