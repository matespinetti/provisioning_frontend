export interface User {
  id: string
  username: string
}

export interface LoginResponse {
  success: boolean
  access_token: string
  refresh_token: string
  expires_in: number
  user: User
}

export interface RefreshResponse {
  success: boolean
  access_token: string
  expires_in: number
}

export interface LogoutResponse {
  success: boolean
  msg: string
}
