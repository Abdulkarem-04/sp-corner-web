'use client';

import React, { useState } from 'react';
import {
    QrCode,
    Camera,
    ShieldAlert,
    BarChart3,
    Trophy,
    Scale,
    Leaf,
    Users,
    Award,
    CalendarClock,
    ShieldCheck,
    Layers,
    CheckCircle2,
    UserCheck,
} from 'lucide-react';
import StudentDashboard from './StudentDashboard';
import VolunteerScannerTerminal from './VolunteerScannerTerminal';
import AdminGovernancePanel from './AdminGovernancePanel';
import type {
    AppUser,
    MaterialCategory,
    PublicCampusStats,
    PublicLeaderboardEntry,
    StudentLedger,
    Submission,
    SystemSettings,
} from '@/types/database';

type AppTab = 'impact' | 'pass' | 'leaderboard' | 'volunteer' | 'admin';

interface AuthenticatedWorkspaceProps {
    currentUser: AppUser | null;
    studentLedger: StudentLedger | null;
    studentSubmissions: Submission[];
    settings: SystemSettings;
    materials: MaterialCategory[];
    campusStats: PublicCampusStats;
    leaderboard: PublicLeaderboardEntry[];
    allStudentsForStaff: StudentLedger[];
    allSubmissionsForAdmin: Submission[];
}

export default function AuthenticatedWorkspace({
                                                   currentUser,
                                                   studentLedger,
                                                   studentSubmissions,
                                                   settings,
                                                   materials,
                                                   campusStats,
                                                   leaderboard,
                                                   allStudentsForStaff,
                                                   allSubmissionsForAdmin,
                                               }: AuthenticatedWorkspaceProps) {
    const defaultTab: AppTab = currentUser ? 'pass' : 'impact';
    const [activeTab, setActiveTab] = useState<AppTab>(defaultTab);

    const isStaff = currentUser?.role === 'volunteer' || currentUser?.role === 'admin';
    const isAdmin = currentUser?.role === 'admin';
    const hallOfFameLeaders = leaderboard.filter((entry) => entry.hall_of_fame_opt_in);

    const navItems: Array<{ id: AppTab; label: string; shortLabel: string; icon: React.ReactNode; visible: boolean }> = [
        { id: 'impact', label: 'Campus Impact & Rates', shortLabel: 'Impact', icon: <BarChart3 className="w-4 h-4" />, visible: true },
        { id: 'pass', label: 'My QR Pass & Ledger', shortLabel: 'My Pass', icon: <QrCode className="w-4 h-4" />, visible: true },
        { id: 'leaderboard', label: 'Leaderboard & Hall of Fame', shortLabel: 'Ranks', icon: <Trophy className="w-4 h-4" />, visible: true },
        { id: 'volunteer', label: 'Station Scanner', shortLabel: 'Scanner', icon: <Camera className="w-4 h-4" />, visible: isStaff },
        { id: 'admin', label: 'Project Lead Admin', shortLabel: 'Admin', icon: <ShieldAlert className="w-4 h-4" />, visible: isAdmin },
    ];
    const visibleTabs = navItems.filter((item) => item.visible);

    const renderLevelBadge = (entry: PublicLeaderboardEntry) => {
        if (entry.is_level_3_certified) return <span className="px-2 py-0.5 rounded bg-yellow-50 border border-yellow-300 text-[10px] font-bold text-yellow-800">Lvl 3 Pioneer</span>;
        if (entry.is_level_2_leader) return <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-300 text-[10px] font-bold text-slate-700">Lvl 2 Leader</span>;
        if (entry.is_level_1_pioneer) return <span className="px-2 py-0.5 rounded bg-orange-50 border border-orange-200 text-[10px] font-bold text-orange-800">Lvl 1 Starter</span>;
        return null;
    };

    return (
        <div className="pb-20 sm:pb-8 space-y-6">
            <nav className="hidden sm:flex items-center justify-between bg-white border border-slate-200 rounded-xl p-1.5 shadow-2xs">
                <div className="flex flex-wrap items-center gap-1">
                    {visibleTabs.map((tab) => (
                        <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${activeTab === tab.id ? tab.id === 'admin' ? 'bg-amber-600 text-white shadow-2xs' : 'bg-emerald-700 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
                            {tab.icon}<span>{tab.label}</span>
                        </button>
                    ))}
                </div>
                <span className="text-[11px] font-medium text-slate-400 px-3 hidden lg:inline">8-Week Hostel Pilot • Target Sponsor: PPK</span>
            </nav>

            {activeTab === 'impact' && (
                <div className="space-y-6">
                    <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-8 shadow-2xs">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 pb-6 border-b border-slate-200">
                            <div className="space-y-2 max-w-2xl">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                                    <CalendarClock className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                                    <span>Hostel Ground-Floor Station • Twice Weekly (2 Hours / Session)</span>
                                </div>
                                <h1 className="text-xl sm:text-3xl font-bold text-slate-900 tracking-tight">Sustainability Pioneers Corner (SP Corner)</h1>
                                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                                    Albukhary International University (AIU) Hostel Recycling Buy-Back Pilot. Bring segregated recyclables ({Number(settings.min_qualifying_kg).toFixed(2)} kg minimum qualifying threshold per drop) to earn rewards and unlock the 3-Tier progression system.
                                </p>
                            </div>
                            <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-4 min-w-[240px] max-w-sm space-y-1.5">
                                <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                                    <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                                    <span>PDPA & Data Minimization Verified</span>
                                </div>
                                <p className="text-xs text-slate-600 leading-relaxed">
                                    Public leaderboards mask all Student IDs (e.g., AIU****821). Sign in via your institutional AIU account to access your QR Pass and personal ledger.
                                </p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pt-6">
                            <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-200">
                                <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-1">
                                    <span>Campus Diverted</span><Scale className="w-4 h-4 text-sky-600 shrink-0" />
                                </div>
                                <p className="text-xl sm:text-2xl font-bold text-slate-900 font-mono">
                                    {Number(campusStats.total_campus_weight_kg).toFixed(2)} <span className="text-xs font-sans font-semibold text-sky-700">kg</span>
                                </p>
                                <p className="text-[11px] text-slate-500 mt-1">Verified net scale weight</p>
                            </div>
                            <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-200">
                                <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-1">
                                    <span>Carbon Offset</span><Leaf className="w-4 h-4 text-emerald-600 shrink-0" />
                                </div>
                                <p className="text-xl sm:text-2xl font-bold text-slate-900 font-mono">
                                    {Number(campusStats.total_campus_co2_kg).toFixed(2)} <span className="text-xs font-sans font-semibold text-emerald-700">kg CO2</span>
                                </p>
                                <p className="text-[11px] text-slate-500 mt-1">Across 4 material streams</p>
                            </div>
                            <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-200">
                                <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-1">
                                    <span>Active Pioneers</span><Users className="w-4 h-4 text-indigo-600 shrink-0" />
                                </div>
                                <p className="text-xl sm:text-2xl font-bold text-slate-900 font-mono">{campusStats.active_participants}</p>
                                <p className="text-[11px] text-slate-500 mt-1">Verified contributors</p>
                            </div>
                            <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-200">
                                <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-1">
                                    <span>Level 1 Achievers</span><Award className="w-4 h-4 text-amber-600 shrink-0" />
                                </div>
                                <p className="text-xl sm:text-2xl font-bold text-slate-900 font-mono">{campusStats.tier1_achievers}</p>
                                <p className="text-[11px] text-slate-500 mt-1">Unlocked Starter Milestone</p>
                            </div>
                        </div>
                    </section>
                    <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-2xs">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                            <div className="flex items-center gap-2">
                                <Layers className="w-4 h-4 text-emerald-700" />
                                <h2 className="text-base font-bold text-slate-900">Accepted Segregation Streams & Base Rates</h2>
                            </div>
                            <span className="text-xs font-medium text-slate-500">Qualifying threshold: {Number(settings.min_qualifying_kg).toFixed(2)} kg</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {materials.map((mat) => (
                                <div key={mat.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900">{mat.name}</h3>
                                        <p className="text-xs text-slate-500 mt-1">CO2 Factor: {Number(mat.co2_per_kg).toFixed(2)} kg CO2 / kg</p>
                                    </div>
                                    <div className="mt-4 pt-3 border-t border-slate-200 flex items-baseline justify-between">
                                        <span className="text-xs text-slate-500">Base Rate:</span>
                                        <span className="text-base font-mono font-bold text-emerald-700">{Number(mat.base_rate_per_kg).toFixed(2)} {settings.currency_label} / kg</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            )}

            {activeTab === 'pass' && (
                <div>
                    {currentUser ? (
                        <StudentDashboard user={currentUser} ledger={studentLedger} submissions={studentSubmissions} settings={settings} materials={materials} />
                    ) : (
                        <section className="bg-white border border-slate-200 rounded-2xl p-8 text-center max-w-lg mx-auto my-6 shadow-2xs space-y-3">
                            <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 mx-auto">
                                <QrCode className="w-6 h-6" />
                            </div>
                            <h2 className="text-lg font-bold text-slate-900">Student QR Pass & Personal Ledger</h2>
                            <p className="text-xs text-slate-600 leading-relaxed">
                                Click the <span className="font-semibold text-emerald-800">Sign In</span> button in the top-right header with your institutional <span className="font-mono">@student.aiu.edu.my</span> account to view your Personal Check-In QR Pass and 3-Level progression.
                            </p>
                            <div className="pt-2 flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-700">
                                <UserCheck className="w-4 h-4" /><span>Zero passwords stored • 100% PDPA Compliant</span>
                            </div>
                        </section>
                    )}
                </div>
            )}

            {activeTab === 'leaderboard' && (
                <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-2xs">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                            <div className="flex items-center gap-2">
                                <Trophy className="w-4 h-4 text-amber-600 shrink-0" />
                                <h2 className="text-base font-bold text-slate-900">Public Hostel Leaderboard (PDPA Masked)</h2>
                            </div>
                            <span className="text-xs font-medium text-slate-500">Ranked by verified net weight</span>
                        </div>
                        {leaderboard.length === 0 ? (
                            <div className="text-center py-10 border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
                                <p className="text-xs text-slate-500">No verified submissions recorded yet. Be the first pioneer on the leaderboard!</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                    <tr className="border-b border-slate-200 text-slate-500">
                                        <th className="py-2.5 pr-3 font-semibold">Rank</th>
                                        <th className="py-2.5 px-3 font-semibold">Pioneer Identity</th>
                                        <th className="py-2.5 px-3 font-semibold text-center">Drops</th>
                                        <th className="py-2.5 px-3 font-semibold text-right">Total Diverted</th>
                                        <th className="py-2.5 pl-3 font-semibold text-right">CO2 Offset</th>
                                    </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-slate-700">
                                    {leaderboard.map((entry) => (
                                        <tr key={`${entry.rank}-${entry.masked_id}`} className="hover:bg-slate-50/80">
                                            <td className="py-3 pr-3 font-mono font-bold text-slate-900">#{entry.rank}</td>
                                            <td className="py-3 px-3">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="font-mono font-bold text-slate-900">{entry.public_identity}</span>
                                                    {renderLevelBadge(entry)}
                                                </div>
                                            </td>
                                            <td className="py-3 px-3 text-center font-mono font-medium">{entry.verified_submissions_count}</td>
                                            <td className="py-3 px-3 text-right font-mono font-bold text-sky-700">{Number(entry.total_weight_kg).toFixed(2)} kg</td>
                                            <td className="py-3 pl-3 text-right font-mono font-semibold text-emerald-700">{Number(entry.total_co2_saved_kg).toFixed(2)} kg</td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                    <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-2xs flex flex-col justify-between">
                        <div>
                            <div className="flex items-center gap-2 text-amber-600 mb-2">
                                <Award className="w-5 h-5 shrink-0" />
                                <h2 className="text-base font-bold text-slate-900">Tier 2: Hall of Fame (Opt-In)</h2>
                            </div>
                            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                                2-Month Evaluation candidates for PPK / 3 Zero Club formal sustainability leadership certificates and eco-apparel recognition.
                            </p>
                            {hallOfFameLeaders.length === 0 ? (
                                <div className="p-6 text-center border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
                                    <p className="text-xs text-slate-500">Contributors who opt-in via their Student Dashboard privacy settings will appear here.</p>
                                </div>
                            ) : (
                                <div className="space-y-2.5">
                                    {hallOfFameLeaders.slice(0, 8).map((leader) => (
                                        <div key={`hof-${leader.rank}-${leader.masked_id}`} className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                                            <div className="flex items-center gap-2.5">
                                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                                <div>
                                                    <p className="text-xs font-bold text-slate-900 font-mono">{leader.public_identity}</p>
                                                    <p className="text-[11px] text-slate-500">{leader.verified_submissions_count} verified sessions</p>
                                                </div>
                                            </div>
                                            <span className="text-xs font-mono font-bold text-emerald-700">{Number(leader.total_weight_kg).toFixed(2)} kg</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="mt-6 pt-4 border-t border-slate-200 text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-2">
                            <span>Sustainability Pioneers • 3 Zero Club, AIU</span>
                            <span className="font-medium text-slate-600">Target Sponsor: PPK</span>
                        </div>
                    </div>
                </section>
            )}

            {isStaff && activeTab === 'volunteer' && <VolunteerScannerTerminal materials={materials} settings={settings} allStudents={allStudentsForStaff} />}
            {isAdmin && activeTab === 'admin' && <AdminGovernancePanel settings={settings} materials={materials} submissions={allSubmissionsForAdmin} students={allStudentsForStaff} />}

            <nav className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200 px-2 py-1.5 shadow-lg">
                <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${visibleTabs.length}, minmax(0, 1fr))` }}>
                    {visibleTabs.map((tab) => (
                        <button key={`mob-${tab.id}`} type="button" onClick={() => setActiveTab(tab.id)} className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer ${activeTab === tab.id ? tab.id === 'admin' ? 'text-amber-700 bg-amber-50' : 'text-emerald-800 bg-emerald-50' : 'text-slate-500 hover:text-slate-900'}`}>
                            {tab.icon}<span className="mt-1 truncate max-w-full">{tab.shortLabel}</span>
                        </button>
                    ))}
                </div>
            </nav>
        </div>
    );
}