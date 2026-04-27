import client from './client'
import type { ExpCalculatorRequest, ExpCalculatorResponse, StatsComparison } from '../types'

export const statsApi = {
  getUserComparison: () =>
    client.get<StatsComparison>('/stats/comparison'),

  calculateExp: (data: ExpCalculatorRequest) =>
    client.post<ExpCalculatorResponse>('/stats/exp-calculator', data),
}
