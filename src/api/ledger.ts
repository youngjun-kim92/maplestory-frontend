import client from './client'
import type { IncomeTrend, LedgerAddResponse, LedgerEntryRequest, LedgerStat, WeeklyLedger, WeeklySummary } from '../types'

export const ledgerApi = {
  getWeeklyLedger: (week?: string) =>
    client.get<WeeklyLedger>('/ledger', { params: week ? { week } : {} }),

  addEntry: (data: LedgerEntryRequest) =>
    client.post<LedgerAddResponse>('/ledger', data),

  deleteEntry: (id: number) =>
    client.delete(`/ledger/${id}`),

  getWeeksList: () =>
    client.get<WeeklySummary[]>('/ledger/weeks'),

  getIncomeTrend: (weeks = 8) =>
    client.get<IncomeTrend[]>('/ledger/income-trend', { params: { weeks } }),

  getCategoryStats: (weeks = 4) =>
    client.get<LedgerStat[]>('/ledger/stats', { params: { weeks } }),
}
