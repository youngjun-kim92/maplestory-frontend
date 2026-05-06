import client from './client'
import type { ServerProfileRequest, ServerProfileResponse } from '../types'

export const serverProfilesApi = {
  getProfiles: () =>
    client.get<ServerProfileResponse[]>('/server-profiles'),

  createProfile: (data: ServerProfileRequest) =>
    client.post<ServerProfileResponse>('/server-profiles', data),

  updateProfile: (id: number, data: ServerProfileRequest) =>
    client.put<ServerProfileResponse>(`/server-profiles/${id}`, data),

  deleteProfile: (id: number) =>
    client.delete(`/server-profiles/${id}`),
}
