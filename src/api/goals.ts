import client from './client'
import type { Goal, GoalEstimate, GoalRequest } from '../types'

export const goalsApi = {
  createGoal: (data: GoalRequest) =>
    client.post<Goal>('/goals', data),

  getGoals: () =>
    client.get<Goal[]>('/goals'),

  updateGoal: (id: number, data: GoalRequest) =>
    client.put<Goal>(`/goals/${id}`, data),

  deleteGoal: (id: number) =>
    client.delete(`/goals/${id}`),

  markAchieved: (id: number) =>
    client.patch<Goal>(`/goals/${id}/achieve`),

  getGoalEstimate: (id: number) =>
    client.get<GoalEstimate>(`/goals/${id}/estimate`),
}
