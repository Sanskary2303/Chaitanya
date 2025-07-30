import axios, { AxiosResponse } from 'axios';

const BACKEND_IP = 'localhost';
const API_URL = `http://${BACKEND_IP}:3000`;

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'user';
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    token: string;
    expiresIn: string;
  };
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  role?: 'admin' | 'user';
}

class AuthService {
  private token: string | null = null;
  private user: User | null = null;

  constructor() {
    // Load token from localStorage on initialization
    this.token = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('user');
    this.user = storedUser ? JSON.parse(storedUser) : null;

    // Set up axios interceptor to include auth token
    this.setupAxiosInterceptor();
  }

  private setupAxiosInterceptor() {
    axios.interceptors.request.use(
      (config) => {
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Handle 401 responses
    axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          this.logout();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response: AxiosResponse<AuthResponse> = await axios.post(
        `${API_URL}/auth/login`,
        credentials
      );

      if (response.data.success) {
        this.setAuthData(response.data.data.token, response.data.data.user);
      }

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      const response: AxiosResponse<AuthResponse> = await axios.post(
        `${API_URL}/auth/register`,
        data
      );

      if (response.data.success) {
        this.setAuthData(response.data.data.token, response.data.data.user);
      }

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Registration failed');
    }
  }

  async getProfile(): Promise<User> {
    try {
      const response: AxiosResponse<{ success: boolean; data: { user: User } }> =
        await axios.get(`${API_URL}/auth/profile`);

      if (response.data.success) {
        this.user = response.data.data.user;
        localStorage.setItem('user', JSON.stringify(this.user));
        return this.user;
      }

      throw new Error('Failed to get profile');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to get profile');
    }
  }

  logout(): void {
    this.token = null;
    this.user = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  }

  private setAuthData(token: string, user: User): void {
    this.token = token;
    this.user = user;
    localStorage.setItem('authToken', token);
    localStorage.setItem('user', JSON.stringify(user));
  }

  isAuthenticated(): boolean {
    return !!this.token && !!this.user;
  }

  getToken(): string | null {
    return this.token;
  }

  getUser(): User | null {
    return this.user;
  }

  isAdmin(): boolean {
    return this.user?.role === 'admin';
  }

  // Get WebSocket URL with authentication token
  getWebSocketURL(baseUrl: string): string {
    if (this.token) {
      const url = new URL(baseUrl);
      url.searchParams.set('token', this.token);
      return url.toString();
    }
    return baseUrl;
  }
}

export const authService = new AuthService();
export default authService;
