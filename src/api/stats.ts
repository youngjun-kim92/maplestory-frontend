import client from './client'
import type { StatsComparison } from '../types'

export const statsApi = {
  getUserComparison: () =>
    client.get<StatsComparison>('/stats/comparison'),
}
