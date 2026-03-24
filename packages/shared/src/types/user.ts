// 用户相关类型定义

export interface User {
  id: string;
  phone: string;
  name?: string;
  avatar?: string;
  createdAt: string;
}

export interface LoginRequest {
  phone: string;
  code: string;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  user?: User;
  message?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}
