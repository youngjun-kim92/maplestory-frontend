import client from './client'
import type { HuntingSession, HuntingSessionRequest, HuntingStats } from '../types'

export const huntingApi = {
  recordSession: (data: HuntingSessionRequest) =>
    client.post<HuntingSession>('/hunting/session', data),

  getWeeklySessions: (week?: string) =>
    client.get<HuntingSession[]>('/hunting/sessions', { params: week ? { week } : {} }),

  getHuntingStats: () =>
    client.get<HuntingStats[]>('/hunting/stats'),
}
