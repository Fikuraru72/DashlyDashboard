"use client";

import { authenticatedFetch } from "@/lib/api";
import React, { useEffect, useState } from "react";
import { Users, Shield } from "lucide-react";
import { usePermissions } from "../../../hooks/usePermissions";
import { useAuthStore } from "../../../store/useAuthStore";
import { UserTable } from "../../../components/users/UserTable";
import { RoleManagement } from "../../../components/roles/RoleManagement";
import { AddUserModal } from "../../../components/users/AddUserModal";

interface RoleData {
  id: number;
  name: string;
  permissions: string[];
}

interface UserData {
  id: number;
  email: string;
  name: string;
  phone?: string;
  role?: RoleData;
  healthInfo?: Record<string, any> | null;
}

const AVAILABLE_PERMISSIONS = [
  "view_dashboard",
  "manage_users",
  "manage_roles",
  "manage_events",
  "create_event",
  "delete_user",
];

export default function UsersPage() {
  const { fetchUser } = useAuthStore();
  const { hasPermission, isLoading: authLoading, user } = usePermissions();
  const [users, setUsers] = useState<UserData[]>([]);
  const [roles, setRoles] = useState<RoleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"users" | "roles">("users");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Fetch auth user if not loaded
  useEffect(() => {
    if (!user) {
      void fetchUser();
    }
  }, [user, fetchUser]);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const tokenMatch = document.cookie.match(new RegExp("(^| )auth_token=([^;]+)"));
        const token = tokenMatch ? tokenMatch[2] : null;

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

        // Fetch Users
        const usersRes = await authenticatedFetch(`${apiUrl}/users`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!usersRes.ok) throw new Error("Failed to fetch users");
        const usersData = await usersRes.json();
        setUsers(usersData);

        // Fetch Roles
        const rolesRes = await authenticatedFetch(`${apiUrl}/roles`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (rolesRes.ok) {
          const rolesData = await rolesRes.json();
          setRoles(rolesData);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      if (hasPermission("manage_users")) {
        void fetchAllData();
      } else {
        setLoading(false);
        setError("You do not have permission to view users.");
      }
    }
  }, [user, hasPermission]);

  const canManageUsers = hasPermission("manage_users");

  const handleDeleteUser = async (id: number) => {
    if (!canManageUsers) return;
    if (!confirm("Are you sure you want to delete this user?")) return;

    try {
      const tokenMatch = document.cookie.match(new RegExp("(^| )auth_token=([^;]+)"));
      const token = tokenMatch ? tokenMatch[2] : null;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

      const response = await authenticatedFetch(`${apiUrl}/users/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        setUsers(users.filter((u) => u.id !== id));
      } else {
        alert("Failed to delete user");
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("Error deleting user");
    }
  };

  const handleEditUser = (user: UserData) => {
    alert(`Edit feature for user ${user.name} is not fully implemented yet.`);
  };

  const handleUpdateRole = async (roleId: number, newPermissions: string[]) => {
    const tokenMatch = document.cookie.match(new RegExp("(^| )auth_token=([^;]+)"));
    const token = tokenMatch ? tokenMatch[2] : null;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

    const response = await authenticatedFetch(`${apiUrl}/roles/${roleId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ permissions: newPermissions }),
    });

    if (!response.ok) {
      throw new Error("Failed to update role");
    }

    // Update local state
    setRoles(roles.map((r) => (r.id === roleId ? { ...r, permissions: newPermissions } : r)));
    // Also update users state to reflect changes instantly if any
    setUsers(
      users.map((u) =>
        u.role?.id === roleId ? { ...u, role: { ...u.role, permissions: newPermissions } } : u,
      ),
    );
  };

  const handleCreateUser = async (userData: any) => {
    const tokenMatch = document.cookie.match(new RegExp("(^| )auth_token=([^;]+)"));
    const token = tokenMatch ? tokenMatch[2] : null;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

    const response = await authenticatedFetch(`${apiUrl}/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || "Failed to create user");
    }

    const newUser = await response.json();

    // Attach role object to the new user for UI rendering
    const assignedRole = roles.find((r) => r.id === newUser.roleId);
    if (assignedRole) {
      newUser.role = assignedRole;
    }

    setUsers([...users, newUser]);
  };

  if (authLoading || (loading && user))
    return (
      <div className="flex-1 flex items-center justify-center p-8 h-full bg-slate-100/50 dark:bg-slate-950/50">
        <div className="text-slate-500 font-medium animate-pulse">
          Loading User Administration...
        </div>
      </div>
    );

  return (
    <div className="p-8 flex flex-col h-full overflow-auto bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/40 rounded-full flex items-center justify-center shadow-inner">
            {activeTab === "users" ? (
              <Users className="h-6 w-6 text-indigo-600 dark:text-cyan-400" />
            ) : (
              <Shield className="h-6 w-6 text-indigo-600 dark:text-cyan-400" />
            )}
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {activeTab === "users" ? "User Administration" : "Role Management"}
            </h1>
            <p className="text-slate-500 text-sm mt-1 font-medium">
              {activeTab === "users"
                ? "Manage system users and their assignments"
                : "Configure role-based access control policies"}
            </p>
          </div>
        </div>

        {canManageUsers && activeTab === "users" && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl shadow-md hover:bg-indigo-700 hover:shadow-lg transition-all font-semibold text-sm whitespace-nowrap"
          >
            + Add User
          </button>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab("users")}
          className={`px-4 py-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === "users"
              ? "border-indigo-600 text-indigo-600 dark:border-cyan-400 dark:text-cyan-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
          }`}
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" /> Users
          </div>
        </button>
        <button
          onClick={() => setActiveTab("roles")}
          className={`px-4 py-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === "roles"
              ? "border-indigo-600 text-indigo-600 dark:border-cyan-400 dark:text-cyan-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
          }`}
        >
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4" /> RBAC Settings
          </div>
        </button>
      </div>

      {/* Content Area */}
      {error ? (
        <div className="bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 p-4 rounded-xl border border-rose-200 dark:border-rose-800 font-medium flex items-center gap-3">
          {error}
        </div>
      ) : (
        <div className="flex-1">
          {activeTab === "users" && (
            <UserTable
              users={users}
              roles={roles}
              canManageUsers={canManageUsers}
              onDelete={handleDeleteUser}
              onEdit={handleEditUser}
            />
          )}

          {activeTab === "roles" && (
            <RoleManagement
              roles={roles}
              availablePermissions={AVAILABLE_PERMISSIONS}
              onUpdateRole={handleUpdateRole}
            />
          )}
        </div>
      )}

      {/* Add User Modal */}
      <AddUserModal
        isOpen={isAddModalOpen}
        roles={roles}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleCreateUser}
      />
    </div>
  );
}
