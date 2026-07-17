"use client";

import React, { useState } from "react";
import { Shield, Plus, Save, AlertCircle, Check } from "lucide-react";

interface Role {
  id: number;
  name: string;
  permissions: string[];
}

interface RoleManagementProps {
  roles: Role[];
  availablePermissions: string[];
  onUpdateRole: (roleId: number, newPermissions: string[]) => Promise<void>;
  onCreateRole?: (name: string, permissions: string[]) => Promise<void>;
}

export function RoleManagement({
  roles,
  availablePermissions,
  onUpdateRole,
  onCreateRole,
}: RoleManagementProps) {
  const [activeRoleId, setActiveRoleId] = useState<number | null>(roles[0]?.id || null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [successId, setSuccessId] = useState<number | null>(null);

  // Local state for permissions to allow editing before saving
  const [stagedPermissions, setStagedPermissions] = useState<Record<number, string[]>>({});

  const activeRole = roles.find((r) => r.id === activeRoleId);
  const currentPermissions = activeRoleId
    ? (stagedPermissions[activeRoleId] ?? activeRole?.permissions ?? [])
    : [];

  const handleTogglePermission = (permission: string) => {
    if (!activeRoleId) return;

    const newPerms = currentPermissions.includes(permission)
      ? currentPermissions.filter((p) => p !== permission)
      : [...currentPermissions, permission];

    setStagedPermissions((prev) => ({
      ...prev,
      [activeRoleId]: newPerms,
    }));
  };

  const handleSave = async () => {
    if (!activeRoleId) return;
    setSavingId(activeRoleId);

    try {
      await onUpdateRole(activeRoleId, currentPermissions);
      setSuccessId(activeRoleId);
      setTimeout(() => setSuccessId(null), 2000);
    } catch (error) {
      console.error("Failed to update role", error);
    } finally {
      setSavingId(null);
    }
  };

  // Helper to format permission string 'manage_users' -> 'Manage Users'
  const formatPermissionName = (perm: string) => {
    return perm
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Sidebar: Roles List */}
      <div className="lg:col-span-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-500" />
            Roles
          </h3>
          {onCreateRole && (
            <button className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 dark:hover:text-cyan-400 rounded-lg transition-colors">
              <Plus className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {roles.map((role) => (
            <button
              key={role.id}
              onClick={() => setActiveRoleId(role.id)}
              className={`flex flex-col items-start w-full text-left p-4 rounded-2xl border transition-all duration-200 ${
                activeRoleId === role.id
                  ? "bg-indigo-50 border-indigo-200 shadow-sm shadow-indigo-100 dark:bg-indigo-500/10 dark:border-indigo-500/30"
                  : "bg-white border-slate-200 hover:border-indigo-200 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:hover:bg-slate-800"
              }`}
            >
              <span
                className={`font-bold text-sm ${activeRoleId === role.id ? "text-indigo-700 dark:text-cyan-400" : "text-slate-700 dark:text-slate-200"}`}
              >
                {role.name}
              </span>
              <span className="text-xs font-medium text-slate-400 mt-1">
                {(stagedPermissions[role.id] ?? role.permissions).length} Permissions active
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Right Panel: Permissions Matrix */}
      <div className="lg:col-span-8">
        {activeRole ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col h-full">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                  {activeRole.name} Permissions
                </h3>
                <p className="text-sm font-medium text-slate-500 mt-1">
                  Configure access levels for this role. Changes apply on save.
                </p>
              </div>
              <button
                onClick={handleSave}
                disabled={savingId === activeRole.id}
                className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 ${
                  successId === activeRole.id
                    ? "bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400"
                    : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 disabled:opacity-70"
                }`}
              >
                {successId === activeRole.id ? (
                  <>
                    <Check className="w-4 h-4" /> Saved
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />{" "}
                    {savingId === activeRole.id ? "Saving..." : "Save Changes"}
                  </>
                )}
              </button>
            </div>

            {/* Permissions Grid */}
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
              {availablePermissions.map((permission) => {
                const isChecked = currentPermissions.includes(permission);

                return (
                  <label
                    key={permission}
                    className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 group ${
                      isChecked
                        ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/5 dark:border-cyan-500"
                        : "border-slate-100 hover:border-slate-300 bg-white dark:bg-slate-900 dark:border-slate-800 dark:hover:border-slate-700"
                    }`}
                  >
                    <div className="flex flex-col">
                      <span
                        className={`font-bold text-sm transition-colors ${isChecked ? "text-indigo-700 dark:text-cyan-400" : "text-slate-700 dark:text-slate-300"}`}
                      >
                        {formatPermissionName(permission)}
                      </span>
                      <span className="text-xs font-medium text-slate-400 mt-0.5 font-mono">
                        {permission}
                      </span>
                    </div>

                    {/* Custom Toggle Switch */}
                    <div className="relative inline-flex items-center ml-4 shrink-0">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={isChecked}
                        onChange={() => handleTogglePermission(permission)}
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600 dark:peer-checked:bg-cyan-500 peer-checked:after:border-transparent shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]"></div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="h-full min-h-[400px] flex flex-col items-center justify-center p-8 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-white/50 dark:bg-slate-900/50">
            <AlertCircle className="w-10 h-10 text-slate-300 dark:text-slate-700 mb-3" />
            <h4 className="text-lg font-bold text-slate-500 dark:text-slate-400">Select a Role</h4>
            <p className="text-sm font-medium text-slate-400 dark:text-slate-500 mt-1">
              Choose a role from the sidebar to view and edit its permissions.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
