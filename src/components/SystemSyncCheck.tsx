'use client';

import { useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SyncResponse {
    status: string;
    dbConnected: boolean;
    userCount: number;
    eventCount: number;
    serverTime: string;
}

type PingState = 'idle' | 'loading' | 'success' | 'error';

// ─── Component ────────────────────────────────────────────────────────────────

export default function SystemSyncCheck() {
    const [state, setState] = useState<PingState>('idle');
    const [result, setResult] = useState<SyncResponse | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [latencyMs, setLatencyMs] = useState<number | null>(null);

    const BACKEND_URL =
        process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

    async function handlePing() {
        setState('loading');
        setResult(null);
        setErrorMsg(null);
        setLatencyMs(null);

        const t0 = performance.now();
        try {
            const res = await fetch(`${BACKEND_URL}/health/sync`, {
                cache: 'no-store',
            });
            const ms = Math.round(performance.now() - t0);
            setLatencyMs(ms);

            if (!res.ok) {
                throw new Error(`HTTP ${res.status} – ${res.statusText}`);
            }

            const data: SyncResponse = await res.json();
            setResult(data);
            setState('success');
        } catch (err: unknown) {
            setLatencyMs(Math.round(performance.now() - t0));
            setErrorMsg(err instanceof Error ? err.message : 'Unknown error');
            setState('error');
        }
    }

    // ─── Status helpers ────────────────────────────────────────────────────────
    const statusColors: Record<PingState, string> = {
        idle:    'border-white/10 bg-white/5',
        loading: 'border-blue-500/40 bg-blue-500/10',
        success: 'border-emerald-500/40 bg-emerald-500/10',
        error:   'border-red-500/40 bg-red-500/10',
    };

    const dotColors: Record<PingState, string> = {
        idle:    'bg-slate-500',
        loading: 'bg-blue-400 animate-pulse',
        success: 'bg-emerald-400',
        error:   'bg-red-400',
    };

    const statusLabels: Record<PingState, string> = {
        idle:    'Not tested',
        loading: 'Pinging…',
        success: 'Connected',
        error:   'Failed',
    };

    return (
        <div className="sync-card">
            {/* ── Header ── */}
            <div className="sync-header">
                <div className="sync-icon">⚡</div>
                <div>
                    <h2 className="sync-title">System Sync Check</h2>
                    <p className="sync-subtitle">
                        Verify Backend · Database · Network are all reachable
                    </p>
                </div>
            </div>

            {/* ── Status badge ── */}
            <div className={`sync-status-bar ${statusColors[state]}`}>
                <span className={`sync-dot ${dotColors[state]}`} />
                <span className="sync-status-label">{statusLabels[state]}</span>
                {latencyMs !== null && (
                    <span className="sync-latency">{latencyMs} ms</span>
                )}
            </div>

            {/* ── Result JSON ── */}
            {state === 'success' && result && (
                <div className="sync-result-grid">
                    <ResultRow icon="🗄️" label="DB Connected" value={result.dbConnected ? 'Yes ✓' : 'No ✗'} ok={result.dbConnected} />
                    <ResultRow icon="👤" label="Users in DB"  value={String(result.userCount)} />
                    <ResultRow icon="📅" label="Events in DB" value={String(result.eventCount)} />
                    <ResultRow icon="🟢" label="Status"       value={result.status} ok={result.status === 'OK'} />
                    <ResultRow icon="🕐" label="Server Time"  value={new Date(result.serverTime).toLocaleString()} fullWidth />
                </div>
            )}

            {/* ── Error ── */}
            {state === 'error' && errorMsg && (
                <div className="sync-error">
                    <span className="sync-error-icon">✗</span>
                    <code className="sync-error-msg">{errorMsg}</code>
                </div>
            )}

            {/* ── Raw JSON toggle ── */}
            {state === 'success' && result && (
                <details className="sync-raw">
                    <summary>Raw JSON response</summary>
                    <pre>{JSON.stringify(result, null, 2)}</pre>
                </details>
            )}

            {/* ── Button ── */}
            <button
                id="sync-ping-btn"
                className="sync-btn"
                onClick={handlePing}
                disabled={state === 'loading'}
            >
                {state === 'loading' ? (
                    <>
                        <span className="sync-spinner" />
                        Pinging…
                    </>
                ) : (
                    '🔗  Test Backend Connection'
                )}
            </button>

            {/* ── Scoped styles ── */}
            <style jsx>{`
                .sync-card {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                    padding: 1.5rem;
                    border-radius: 1rem;
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    background: rgba(15, 23, 42, 0.7);
                    backdrop-filter: blur(12px);
                    max-width: 520px;
                    width: 100%;
                    font-family: 'Inter', system-ui, sans-serif;
                    color: #e2e8f0;
                }

                /* Header */
                .sync-header {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }
                .sync-icon {
                    font-size: 1.5rem;
                    width: 2.5rem;
                    height: 2.5rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: linear-gradient(135deg, #6366f1, #8b5cf6);
                    border-radius: 0.625rem;
                }
                .sync-title {
                    margin: 0;
                    font-size: 1rem;
                    font-weight: 700;
                    color: #f1f5f9;
                }
                .sync-subtitle {
                    margin: 0;
                    font-size: 0.75rem;
                    color: #94a3b8;
                }

                /* Status bar */
                .sync-status-bar {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.625rem 0.875rem;
                    border-radius: 0.625rem;
                    border: 1px solid;
                    font-size: 0.8125rem;
                    font-weight: 500;
                    transition: all 0.3s ease;
                }
                .sync-dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    flex-shrink: 0;
                    transition: background-color 0.3s;
                }
                .sync-status-label { flex: 1; }
                .sync-latency {
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 0.75rem;
                    color: #94a3b8;
                }

                /* Result grid */
                .sync-result-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 0.5rem;
                }

                /* Error */
                .sync-error {
                    display: flex;
                    align-items: flex-start;
                    gap: 0.5rem;
                    padding: 0.75rem;
                    background: rgba(239, 68, 68, 0.1);
                    border-radius: 0.5rem;
                    border: 1px solid rgba(239, 68, 68, 0.3);
                }
                .sync-error-icon { color: #f87171; font-weight: 700; }
                .sync-error-msg  { color: #fca5a5; font-size: 0.8rem; word-break: break-all; }

                /* Raw JSON */
                .sync-raw {
                    border-radius: 0.5rem;
                    border: 1px solid rgba(255,255,255,0.08);
                    overflow: hidden;
                }
                .sync-raw summary {
                    padding: 0.5rem 0.75rem;
                    font-size: 0.75rem;
                    color: #64748b;
                    cursor: pointer;
                    user-select: none;
                }
                .sync-raw pre {
                    margin: 0;
                    padding: 0.75rem;
                    font-size: 0.75rem;
                    color: #a5b4fc;
                    background: rgba(0,0,0,0.3);
                    overflow-x: auto;
                }

                /* Button */
                .sync-btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    padding: 0.75rem 1.25rem;
                    border-radius: 0.625rem;
                    border: none;
                    background: linear-gradient(135deg, #6366f1, #8b5cf6);
                    color: #fff;
                    font-size: 0.875rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: opacity 0.2s, transform 0.1s;
                }
                .sync-btn:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
                .sync-btn:active:not(:disabled) { transform: translateY(0); }
                .sync-btn:disabled { opacity: 0.5; cursor: not-allowed; }

                /* Spinner */
                .sync-spinner {
                    width: 14px;
                    height: 14px;
                    border: 2px solid rgba(255,255,255,0.3);
                    border-top-color: #fff;
                    border-radius: 50%;
                    animation: spin 0.7s linear infinite;
                }
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}

// ─── Helper sub-component ─────────────────────────────────────────────────────
function ResultRow({
    icon,
    label,
    value,
    ok,
    fullWidth,
}: {
    icon: string;
    label: string;
    value: string;
    ok?: boolean;
    fullWidth?: boolean;
}) {
    return (
        <div
            style={{
                gridColumn: fullWidth ? '1 / -1' : undefined,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 0.625rem',
                borderRadius: '0.5rem',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
                fontSize: '0.8125rem',
            }}
        >
            <span>{icon}</span>
            <span style={{ color: '#94a3b8', flex: 1 }}>{label}</span>
            <span
                style={{
                    color: ok === true ? '#34d399' : ok === false ? '#f87171' : '#e2e8f0',
                    fontWeight: 600,
                    fontFamily: 'monospace',
                }}
            >
                {value}
            </span>
        </div>
    );
}
