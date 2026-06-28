import { useAuthStore } from '../store/useAuthStore';

export function usePermissions() {
    const { user, isLoading } = useAuthStore();

    const hasPermission = (permission: string) => {
        if (!user || !user.role || !user.role.permissions) {
            return false;
        }

        return user.role.permissions.includes(permission);
    };

    return {
        hasPermission,
        isLoading,
        user,
    };
}
