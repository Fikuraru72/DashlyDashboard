import React from 'react';
import { X, UserCircle, Mail, Phone, ShieldAlert, HeartPulse, Info as InfoIcon } from 'lucide-react';

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

interface UserDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: UserData | null;
}

export function UserDetailModal({ isOpen, onClose, user }: UserDetailModalProps) {
    if (!isOpen || !user) return null;

    // Parse healthInfo safely if it's stored as a string, else use as is
    let parsedHealthInfo = user.healthInfo;
    if (typeof user.healthInfo === 'string') {
        try {
            parsedHealthInfo = JSON.parse(user.healthInfo);
        } catch (e) {
            parsedHealthInfo = null;
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <div 
                className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={onClose}
            ></div>
            <div className="relative bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 fade-in duration-300">
                
                {/* Decorative Background */}
                <div className="absolute top-0 right-0 w-full h-32 bg-gradient-to-br from-indigo-500/10 to-cyan-500/10 dark:from-indigo-500/20 dark:to-cyan-500/20 -z-10"></div>
                
                <div className="p-6 sm:p-8">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-8">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 shrink-0">
                                <UserCircle size={40} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-2">
                                    {user.name}
                                </h2>
                                <span className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border
                                    ${user.role?.name === 'SUPER_ADMIN' ? 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/20 dark:border-rose-500/30 dark:text-rose-400' : 
                                      user.role?.name === 'STAFF' ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:border-amber-500/30 dark:text-amber-400' :
                                      'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'}`}
                                >
                                    {user.role?.name || 'PARTICIPANT'}
                                </span>
                            </div>
                        </div>
                        <button 
                            onClick={onClose}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all text-slate-400 hover:text-slate-600 shrink-0"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Details Content */}
                    <div className="space-y-6">
                        {/* Contact Info */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="p-4 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-100 dark:border-slate-800/60">
                                <div className="flex items-center gap-2 mb-2 text-slate-400">
                                    <Mail size={14} />
                                    <span className="text-[10px] uppercase font-black tracking-widest">Email Address</span>
                                </div>
                                <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{user.email}</p>
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-100 dark:border-slate-800/60">
                                <div className="flex items-center gap-2 mb-2 text-slate-400">
                                    <Phone size={14} />
                                    <span className="text-[10px] uppercase font-black tracking-widest">Contact Number</span>
                                </div>
                                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                    {user.phone || <span className="text-slate-400 font-medium italic">Not Provided</span>}
                                </p>
                            </div>
                        </div>

                        {/* Health Info */}
                        {user.role?.name === 'PARTICIPANT' && (
                            <div className="p-6 bg-rose-50/50 dark:bg-rose-500/5 rounded-2xl border border-rose-100 dark:border-rose-500/20">
                                <div className="flex items-center gap-3 mb-4 text-rose-600 dark:text-rose-400">
                                    <HeartPulse size={18} />
                                    <h3 className="font-bold text-sm uppercase tracking-wider">Safety & Health Info</h3>
                                </div>
                                
                                {parsedHealthInfo && Object.keys(parsedHealthInfo).length > 0 ? (
                                    <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                                        {Object.entries(parsedHealthInfo).map(([key, value]) => (
                                            <div key={key}>
                                                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-tighter block mb-0.5">
                                                    {key.replace(/([A-Z])/g, ' $1')}
                                                </span>
                                                <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                                                    {String(value)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 text-slate-400">
                                        <InfoIcon size={14} />
                                        <span className="text-xs font-medium italic">No emergency health data reported for this user.</span>
                                    </div>
                                )}
                            </div>
                        )}
                        
                        {/* Permissions (if staff or admin) */}
                        {user.role && user.role.name !== 'PARTICIPANT' && user.role.permissions && user.role.permissions.length > 0 && (
                            <div className="p-6 bg-amber-50/50 dark:bg-amber-500/5 rounded-2xl border border-amber-100 dark:border-amber-500/20">
                                <div className="flex items-center gap-3 mb-4 text-amber-600 dark:text-amber-400">
                                    <ShieldAlert size={18} />
                                    <h3 className="font-bold text-sm uppercase tracking-wider">Role Permissions</h3>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {user.role.permissions.map((perm, index) => (
                                        <span key={index} className="px-2 py-1 bg-amber-100/50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 rounded-md text-[10px] font-bold uppercase tracking-wider">
                                            {perm}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mt-8">
                        <button 
                            onClick={onClose}
                            className="w-full py-4 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-2xl font-bold transition-all shadow-lg"
                        >
                            Dismiss Information
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
