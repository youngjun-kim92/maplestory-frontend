import client from './client'
import type { LedgerEntryRequest, WeeklyLedger, WeeklySummary } from '../types'

export const ledgerApi = {
  getWeeklyLedger: (week?: string) =>
    client.get<WeeklyLedger>('/ledger', { params: week ? { week } : {} }),

  addEntry: (data: LedgerEntryRequest) =>
    client.post<WeeklyLedger>('/ledger', data),

  deleteEntry: (id: number) =>
    client.delete(`/ledger/${id}`),

  getWeeksList: () =>
    client.get<WeeklySummary[]>('/ledger/weeks'),

  getCategoryStats: (weeks = 4) =>
    client.get<[string, number][]>('/ledger/stats', { params: { weeks } }),
}
