import client from './client'
import type { AuthResponse, LoginRequest, RegisterRequest, UserResponse } from '../types'

export const authApi = {
  register: (data: RegisterRequest) =>
    client.post<AuthResponse>('/auth/register', data),

  login: (data: LoginRequest) =>
    client.post<AuthResponse>('/auth/login', data),

  getProfile: () =>
    client.get<UserResponse>('/auth/profile'),

  updateSolErdaPrice: (price: number) =>
    client.put('/auth/sol-erda-price', null, { params: { price } }),
}
