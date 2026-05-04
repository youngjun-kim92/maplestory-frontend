import client from './client'
import type { HuntingSession, HuntingSessionRequest, HuntingStats } from '../types'

export const huntingApi = {
  recordSession: (data: HuntingSessionRequest) =>
    client.post<HuntingSession>('/hunting/session', data),

  getWeeklySessions: (params?: { week?: string; characterId?: number }) =>
    client.get<HuntingSession[]>('/hunting/sessions', { params }),

  getHuntingStats: () =>
    client.get<HuntingStats[]>('/hunting/stats'),
}
