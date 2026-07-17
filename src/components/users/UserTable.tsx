"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  Filter,
  MoreVertical,
  Eye,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  User as UserIcon,
} from "lucide-react";
import { UserDetailModal } from "./UserDetailModal";

interface Role {
  id: number;
  name: string;
  permissions: string[];
}

interface UserData {
  id: number;
  email: string;
  name: string;
  phone?: string;
  role?: Role;
  healthInfo?: Record<string, any> | null;
}

interface UserTableProps {
  users: UserData[];
  roles: Role[];
  canManageUsers: boolean;
  onDelete: (id: number) => void;
  onEdit: (user: UserData) => void;
}

export function UserTable({ users, roles, canManageUsers, onDelete, onEdit }: UserTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeDropdownId, setActiveDropdownId] = useState<number | null>(null);

  const itemsPerPage = 8;

  // Filter logic
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesRole = selectedRole === "ALL" || user.role?.name === selectedRole;

      return matchesSearch && matchesRole;
    });
  }, [users, searchQuery, selectedRole]);

  // Pagination logic
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage) || 1;
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const handleViewDetail = (user: UserData) => {
    setSelectedUser(user);
    setIsDrawerOpen(true);
    setActiveDropdownId(null);
  };

  return (
    <div className="flex flex-col space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-shadow text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
          />
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-auto">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={selectedRole}
              onChange={(e) => {
                setSelectedRole(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full sm:w-auto pl-10 pr-8 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer text-slate-700 dark:text-slate-300 font-medium"
            >
              <option value="ALL">All Roles</option>
              {roles.map((r) => (
                <option key={r.id} value={r.name}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-visible relative">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-4 pl-6 font-semibold text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  User
                </th>
                <th className="p-4 font-semibold text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 hidden sm:table-cell">
                  Contact
                </th>
                <th className="p-4 font-semibold text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Role
                </th>
                <th className="p-4 pr-6 font-semibold text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {paginatedUsers.map((u) => (
                <tr
                  key={u.id}
                  className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors group"
                >
                  <td className="p-4 pl-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-indigo-100 dark:border-slate-700">
                        <UserIcon className="w-5 h-5 text-indigo-500 dark:text-slate-400" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                          {u.name}
                        </span>
                        <span className="text-xs font-medium text-slate-400 sm:hidden">
                          {u.email}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 hidden sm:table-cell">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                        {u.email}
                      </span>
                      {u.phone && <span className="text-xs text-slate-400">{u.phone}</span>}
                    </div>
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold border
                                            ${
                                              u.role?.name === "SUPER_ADMIN"
                                                ? "bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-400"
                                                : u.role?.name === "STAFF"
                                                  ? "bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-500/10 dark:border-amber-500/20 dark:text-amber-400"
                                                  : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
                                            }`}
                    >
                      {u.role?.name || "PARTICIPANT"}
                    </span>
                  </td>
                  <td className="p-4 pr-6 text-right relative">
                    <div className="flex items-center justify-end">
                      <button
                        onClick={() => setActiveDropdownId(activeDropdownId === u.id ? null : u.id)}
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {/* Action Dropdown Menu */}
                      {activeDropdownId === u.id && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setActiveDropdownId(null)}
                          ></div>
                          <div className="absolute right-8 top-10 mt-1 w-40 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1 z-20 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                            <button
                              onClick={() => handleViewDetail(u)}
                              className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 transition-colors"
                            >
                              <Eye className="w-4 h-4 text-slate-400" /> View Details
                            </button>
                            {canManageUsers && (
                              <>
                                <button
                                  onClick={() => {
                                    setActiveDropdownId(null);
                                    onEdit(u);
                                  }}
                                  className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 transition-colors"
                                >
                                  <Edit2 className="w-4 h-4 text-indigo-400" /> Edit User
                                </button>
                                <div className="h-px bg-slate-100 dark:bg-slate-700/50 my-1"></div>
                                <button
                                  onClick={() => {
                                    setActiveDropdownId(null);
                                    onDelete(u.id);
                                  }}
                                  className="w-full text-left px-4 py-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 flex items-center gap-2 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" /> Delete User
                                </button>
                              </>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedUsers.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-12 text-center text-slate-500 font-medium">
                    No users found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/50 rounded-b-2xl">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
              {Math.min(currentPage * itemsPerPage, filteredUsers.length)} of {filteredUsers.length}{" "}
              entries
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex gap-1">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                      currentPage === i + 1
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal overlay */}
      <UserDetailModal
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        user={selectedUser}
      />
    </div>
  );
}
