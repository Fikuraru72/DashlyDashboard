import { create } from 'zustand';

interface Role {
    id: number;
    name: string;
    permissions: string[];
}

interface User {
    id: number;
    email: string;
    name: string;
    avatar?: string;
    phone?: string;
    role?: Role;
    roleId?: number;
}

interface AuthState {
    user: User | null;
    isLoading: boolean;
    error: string | null;
    fetchUser: () => Promise<void>;
    logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    isLoading: false,
    error: null,
    fetchUser: async () => {
        set({ isLoading: true, error: null });
        try {
            const tokenMatch = document.cookie.match(new RegExp('(^| )auth_token=([^;]+)'));
            const token = tokenMatch ? tokenMatch[2] : null;

            if (!token) {
                set({ user: null, isLoading: false });
                return;
            }

            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
            const response = await fetch(`${apiUrl}/users/me`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    // Token might be invalid/expired
                    document.cookie = 'auth_token=; Max-Age=0; path=/;';
                }
                throw new Error('Failed to fetch user profile');
            }

            const data = await response.json();
            set({ user: data, isLoading: false });
        } catch (error: any) {
            set({ user: null, error: error.message, isLoading: false });
        }
    },
    logout: () => {
        document.cookie = 'auth_token=; Max-Age=0; path=/;';
        set({ user: null });
    },
}));
