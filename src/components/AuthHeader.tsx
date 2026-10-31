'use client';

import React, { useEffect, useState, useTransition } from 'react';
import {
    Recycle,
    ShieldCheck,
    LogOut,
    Mail,
    ArrowRight,
    CheckCircle2,
    AlertCircle,
    UserCheck,
    X,
    Bell,
    BellRing,
    Smartphone,
    Award,
    Wallet,
    Scale,
} from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import {
    instantInstitutionalSignInAction,
    signOutAction,
} from '@/app/actions/auth-actions';
import { markNotificationsReadAction } from '@/app/actions/admin-actions';
import type { AppUser, NotificationItem } from '@/types/database';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface AuthHeaderProps {
    currentUser: AppUser | null;
    notifications: NotificationItem[];
}

export default function AuthHeader({
                                       currentUser,
                                       notifications,
                                   }: AuthHeaderProps) {
    const [email, setEmail] = useState('');
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [showNotifPanel, setShowNotifPanel] = useState(false);
    const [showInstallHelpModal, setShowInstallHelpModal] = useState(false);
    const [deferredPrompt, setDeferredPrompt] =
        useState<BeforeInstallPromptEvent | null>(null);
    const [isStandalone, setIsStandalone] = useState(false);
    const [pushPermission, setPushPermission] =
        useState<NotificationPermission>('default');
    const [statusMessage, setStatusMessage] = useState<{
        type: 'success' | 'error';
        text: string;
    } | null>(null);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        if (typeof window === 'undefined') return;

        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').catch((err) => {
                console.error('SW registration failed:', err);
            });
        }

        if ('Notification' in window) {
            setPushPermission(Notification.permission);
        }

        const checkStandalone = window.matchMedia(
            '(display-mode: standalone)'
        ).matches;
        setIsStandalone(checkStandalone);

        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        return () => {
            window.removeEventListener(
                'beforeinstallprompt',
                handleBeforeInstallPrompt
            );
        };
    }, []);

    useEffect(() => {
        if (
            typeof window === 'undefined' ||
            !('Notification' in window) ||
            Notification.permission !== 'granted' ||
            notifications.length === 0
        ) {
            return;
        }

        const latest = notifications[0];
        const lastPushedId = window.localStorage.getItem('sp_last_pushed_notif_id');

        if (latest && latest.id !== lastPushedId) {
            window.localStorage.setItem('sp_last_pushed_notif_id', latest.id);
            navigator.serviceWorker.ready
                .then((registration) => {
                    registration.showNotification(latest.title, {
                        body: latest.message,
                        icon: '/icon.svg',
                        badge: '/icon.svg',
                        tag: latest.id,
                    });
                })
                .catch(() => {
                    new Notification(latest.title, {
                        body: latest.message,
                        icon: '/icon.svg',
                    });
                });
        }
    }, [notifications]);

    const unreadCount = notifications.filter(
        (n) => !n.is_read && n.student_id !== null
    ).length;

    const handleEnableNativePush = async () => {
        if (typeof window === 'undefined' || !('Notification' in window)) return;
        const permission = await Notification.requestPermission();
        setPushPermission(permission);

        if (permission === 'granted' && 'serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then((registration) => {
                registration.showNotification('SP Corner Alerts Enabled', {
                    body: 'You will now receive instant notifications for verified drop-offs and hostel collection sessions.',
                    icon: '/icon.svg',
                });
            });
        }
    };

    const handleInstallClick = async () => {
        if (deferredPrompt) {
            await deferredPrompt.prompt();
            const choice = await deferredPrompt.userChoice;
            if (choice.outcome === 'accepted') {
                setDeferredPrompt(null);
            }
        } else {
            setShowInstallHelpModal(true);
        }
    };

    const handleMarkRead = () => {
        startTransition(async () => {
            await markNotificationsReadAction();
        });
    };

    const handleGoogleSignIn = async () => {
        setStatusMessage(null);
        const supabase = createSupabaseBrowserClient();
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
                queryParams: {
                    hd: 'student.aiu.edu.my',
                },
            },
        });

        if (error) {
            setStatusMessage({ type: 'error', text: error.message });
        }
    };

    const handleInstantSignIn = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setStatusMessage(null);

        const formData = new FormData(e.currentTarget);

        startTransition(async () => {
            const res = await instantInstitutionalSignInAction(formData);
            if (res.success) {
                setShowAuthModal(false);
                setEmail('');
            } else {
                setStatusMessage({ type: 'error', text: res.message });
            }
        });
    };

    const handleSignOut = () => {
        startTransition(async () => {
            await signOutAction();
        });
    };

    const renderCategoryIcon = (category: NotificationItem['category']) => {
        switch (category) {
            case 'milestone':
                return <Award className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />;
            case 'payout':
                return <Wallet className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />;
            case 'submission':
                return <Scale className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />;
            default:
                return <BellRing className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />;
        }
    };

    return (
        <>
            <header className="border-b border-slate-200 bg-white/95 backdrop-blur sticky top-0 z-40 shadow-2xs">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 sm:gap-3">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
                            <Recycle className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 tracking-tight text-base sm:text-lg">
                  SP Corner
                </span>
                                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  AIU
                </span>
                            </div>
                            <p className="text-xs text-slate-500 hidden md:block">
                                Sustainability Pioneers (3 Zero Club) • Hostel Buy-Back Tracker
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-2.5">
                        {!isStandalone && (
                            <button
                                type="button"
                                onClick={handleInstallClick}
                                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
                                title="Install SP Corner App"
                            >
                                <Smartphone className="w-4 h-4 text-emerald-700" />
                                <span className="hidden sm:inline">Install App</span>
                            </button>
                        )}

                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setShowNotifPanel((prev) => !prev)}
                                className="relative inline-flex items-center justify-center w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 transition-colors cursor-pointer"
                                title="Notifications"
                            >
                                <Bell className="w-4 h-4" />
                                {unreadCount > 0 && (
                                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center bg-rose-600 text-white">
                    {unreadCount}
                  </span>
                                )}
                            </button>

                            {showNotifPanel && (
                                <div className="fixed sm:absolute right-3 sm:right-0 left-3 sm:left-auto top-16 sm:top-11 sm:w-96 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
                                    <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <BellRing className="w-4 h-4 text-emerald-700" />
                                            <span className="text-xs font-bold text-slate-900">
                        Notifications & Session Alerts
                      </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {unreadCount > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={handleMarkRead}
                                                    disabled={isPending}
                                                    className="text-[11px] font-semibold text-emerald-700 hover:underline cursor-pointer"
                                                >
                                                    Mark read
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => setShowNotifPanel(false)}
                                                className="text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {pushPermission !== 'granted' && (
                                        <div className="px-3.5 py-2.5 bg-emerald-50/70 border-b border-emerald-100 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-slate-700 font-medium">
                        Receive instant collection & drop-off alerts
                      </span>
                                            <button
                                                type="button"
                                                onClick={handleEnableNativePush}
                                                className="px-2.5 py-1 rounded bg-emerald-700 text-[11px] font-semibold text-white hover:bg-emerald-600 cursor-pointer shrink-0"
                                            >
                                                Enable Push
                                            </button>
                                        </div>
                                    )}

                                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                                        {notifications.length === 0 ? (
                                            <div className="p-6 text-center text-xs text-slate-500">
                                                No notifications yet.
                                            </div>
                                        ) : (
                                            notifications.map((item) => (
                                                <div
                                                    key={item.id}
                                                    className={`p-3.5 text-xs flex items-start gap-2.5 ${
                                                        !item.is_read && item.student_id
                                                            ? 'bg-emerald-50/30'
                                                            : 'bg-white'
                                                    }`}
                                                >
                                                    {renderCategoryIcon(item.category)}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <p className="font-bold text-slate-900 truncate">
                                                                {item.title}
                                                            </p>
                                                            <span className="text-[10px] font-mono text-slate-400 shrink-0">
                                {new Date(item.created_at).toLocaleDateString()}
                              </span>
                                                        </div>
                                                        <p className="text-slate-600 mt-1 leading-relaxed">
                                                            {item.message}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {currentUser ? (
                            <div className="flex items-center gap-2">
                                <div className="text-right hidden sm:block">
                                    <div className="flex items-center justify-end gap-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {currentUser.role}
                    </span>
                                        {currentUser.student_id && (
                                            <span className="text-xs font-mono font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {currentUser.student_id}
                      </span>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-slate-500 mt-0.5 truncate max-w-[180px]">
                                        {currentUser.email}
                                    </p>
                                </div>

                                <button
                                    onClick={handleSignOut}
                                    disabled={isPending}
                                    className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer"
                                    title="Sign Out"
                                >
                                    <LogOut className="w-4 h-4 text-slate-600" />
                                    <span className="hidden sm:inline">Sign Out</span>
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowAuthModal(true)}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold bg-emerald-700 hover:bg-emerald-600 text-white shadow-2xs transition-colors cursor-pointer"
                            >
                                <UserCheck className="w-4 h-4" />
                                <span>Sign In</span>
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* PWA Install Instructions Modal */}
            {showInstallHelpModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                            <div className="flex items-center gap-2 text-emerald-700">
                                <Smartphone className="w-5 h-5" />
                                <h2 className="text-base font-bold text-slate-900">
                                    Install SP Corner on Your Device
                                </h2>
                            </div>
                            <button
                                onClick={() => setShowInstallHelpModal(false)}
                                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
                            <p>
                                Install SP Corner on your phone or laptop for 1-tap access to your Student
                                QR Pass and collection alerts:
                            </p>
                            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                                <p className="font-bold text-slate-900">
                                    Android (Chrome) & Desktop (Edge / Chrome):
                                </p>
                                <p>
                                    Tap the browser menu or the{' '}
                                    <span className="font-semibold">Install App</span> icon in the address
                                    bar to add SP Corner to your home screen.
                                </p>
                            </div>
                            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                                <p className="font-bold text-slate-900">iOS (Safari on iPhone):</p>
                                <p>
                                    Tap the <span className="font-semibold">Share</span> button at the
                                    bottom of Safari and select{' '}
                                    <span className="font-semibold">Add to Home Screen</span>.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Clean Production Institutional Sign-In Modal */}
            {showAuthModal && !currentUser && (
                <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl my-auto">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                            <div className="flex items-center gap-2 text-emerald-700">
                                <ShieldCheck className="w-5 h-5" />
                                <h2 className="text-base font-bold text-slate-900">
                                    AIU Student & Staff Sign In
                                </h2>
                            </div>
                            <button
                                onClick={() => {
                                    setShowAuthModal(false);
                                    setStatusMessage(null);
                                }}
                                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <p className="text-xs text-slate-600 mb-5 leading-relaxed">
                            In compliance with Section 4 Data Governance, SP Corner never stores personal
                            passwords. Sign in using your official{' '}
                            <span className="font-semibold">@student.aiu.edu.my</span> or{' '}
                            <span className="font-semibold">@aiu.edu.my</span> account.
                        </p>

                        {statusMessage && (
                            <div
                                className={`mb-4 p-3 rounded-lg border text-xs flex items-start gap-2 ${
                                    statusMessage.type === 'success'
                                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                        : 'bg-rose-50 border-rose-200 text-rose-800'
                                }`}
                            >
                                {statusMessage.type === 'success' ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                ) : (
                                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                                )}
                                <span>{statusMessage.text}</span>
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={handleGoogleSignIn}
                            className="w-full py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer mb-4"
                        >
                            <Mail className="w-4 h-4" />
                            <span>Continue with AIU Google Account</span>
                        </button>

                        <div className="relative my-4 flex items-center justify-center">
                            <div className="border-t border-slate-200 w-full" />
                            <span className="bg-white px-3 text-[11px] uppercase tracking-wider text-slate-400 shrink-0">
                Or Direct Institutional Email
              </span>
                            <div className="border-t border-slate-200 w-full" />
                        </div>

                        <form onSubmit={handleInstantSignIn} className="space-y-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Institutional Email Address
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="name@student.aiu.edu.my"
                                    className="w-full px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-300 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:bg-white"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isPending}
                                className="w-full py-2.5 px-4 rounded-lg bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
                            >
                                <span>{isPending ? 'Verifying...' : 'Sign In with AIU Email'}</span>
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}