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
  onBatchDelete?: (ids: number[]) => void;
  onEdit: (user: UserData) => void;
}

export function UserTable({
  users,
  roles,
  canManageUsers,
  onDelete,
  onBatchDelete,
  onEdit,
}: UserTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeDropdownId, setActiveDropdownId] = useState<number | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [itemsPerPage, setItemsPerPage] = useState(10);

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
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(start, start + itemsPerPage);
  }, [filteredUsers, currentPage, itemsPerPage]);

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
          <label htmlFor="user-search" className="sr-only">Search Users</label>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            id="user-search"
            name="search"
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
            <label htmlFor="role-filter" className="sr-only">Filter by Role</label>
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              id="role-filter"
              name="roleFilter"
              value={selectedRole}
              onChange={(e) => {
                setSelectedRole(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full sm:w-auto pl-10 pr-8 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer text-slate-800 dark:text-slate-200 font-medium"
            >
              <option value="ALL">All Roles</option>
              {roles.map((role) => (
                <option key={role.id} value={role.name}>
                  {role.name}
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
                {canManageUsers && (
                  <th className="p-4 pl-6 w-10">
                    <input
                      type="checkbox"
                      checked={
                        paginatedUsers.length > 0 &&
                        paginatedUsers.every((u) => selectedUserIds.includes(u.id))
                      }
                      onChange={(e) => {
                        const checked = e.target.checked;
                        if (checked) {
                          const pageIds = paginatedUsers.map((u) => u.id);
                          setSelectedUserIds(Array.from(new Set([...selectedUserIds, ...pageIds])));
                        } else {
                          const pageIdSet = new Set(paginatedUsers.map((u) => u.id));
                          setSelectedUserIds(selectedUserIds.filter((id) => !pageIdSet.has(id)));
                        }
                      }}
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 dark:border-slate-700 focus:ring-indigo-500"
                    />
                  </th>
                )}
                <th className={`p-4 ${!canManageUsers ? "pl-6" : ""} font-semibold text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400`}>
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
                  className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors group ${
                    selectedUserIds.includes(u.id) ? "bg-indigo-50/30 dark:bg-indigo-900/10" : ""
                  }`}
                >
                  {canManageUsers && (
                    <td className="p-4 pl-6 w-10">
                      <input
                        type="checkbox"
                        checked={selectedUserIds.includes(u.id)}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          if (checked) {
                            setSelectedUserIds([...selectedUserIds, u.id]);
                          } else {
                            setSelectedUserIds(selectedUserIds.filter((id) => id !== u.id));
                          }
                        }}
                        className="w-4 h-4 text-indigo-600 rounded border-slate-300 dark:border-slate-700 focus:ring-indigo-500"
                      />
                    </td>
                  )}
                  <td className={`p-4 ${!canManageUsers ? "pl-6" : ""}`}>
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
                  <td colSpan={canManageUsers ? 5 : 4} className="p-12 text-center text-slate-500 font-medium">
                    No users found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/50 rounded-b-2xl">
          <div className="flex items-center gap-4">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Showing {filteredUsers.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to{" "}
              {Math.min(currentPage * itemsPerPage, filteredUsers.length)} of {filteredUsers.length}{" "}
              entries
            </span>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
              <span>Per page:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1">
              {(() => {
                if (totalPages <= 7) {
                  return Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                        currentPage === page
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      {page}
                    </button>
                  ));
                }

                const pages: (number | string)[] = [1];
                if (currentPage > 3) pages.push("...");
                const start = Math.max(2, currentPage - 1);
                const end = Math.min(totalPages - 1, currentPage + 1);
                for (let i = start; i <= end; i++) {
                  pages.push(i);
                }
                if (currentPage < totalPages - 2) pages.push("...");
                pages.push(totalPages);

                return pages.map((page, idx) =>
                  typeof page === "number" ? (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                        currentPage === page
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      {page}
                    </button>
                  ) : (
                    <span
                      key={`dots-${idx}`}
                      className="w-8 h-8 flex items-center justify-center text-xs text-slate-400 font-bold"
                    >
                      ...
                    </span>
                  ),
                );
              })()}
            </div>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Drawer */}
      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
        />
      )}

      {/* Floating Selection Action Bar */}
      {selectedUserIds.length > 0 && onBatchDelete && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/90 dark:bg-slate-800/90 backdrop-blur-md text-white px-6 py-3 rounded-2xl shadow-2xl border border-slate-700/50 flex items-center gap-6 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-indigo-500 text-white font-bold text-xs flex items-center justify-center">
              {selectedUserIds.length}
            </span>
            <span className="text-xs font-semibold text-slate-200">User Terpilih</span>
          </div>

          <div className="h-4 w-px bg-slate-700"></div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                onBatchDelete(selectedUserIds);
              }}
              className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2"
            >
              <Trash2 size={14} /> Hapus Terpilih ({selectedUserIds.length})
            </button>
            <button
              onClick={() => setSelectedUserIds([])}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
            >
              Batal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
