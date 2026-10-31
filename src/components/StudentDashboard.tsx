'use client';

import React, { useState, useTransition } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
    QrCode,
    Award,
    Scale,
    Leaf,
    Wallet,
    Clock,
    CheckCircle2,
    AlertCircle,
    Shield,
    Link as LinkIcon,
    Sparkles,
} from 'lucide-react';
import {
    linkStudentIdAction,
    updatePrivacySettingsAction,
} from '@/app/actions/auth-actions';
import type {
    AppUser,
    StudentLedger,
    Submission,
    SystemSettings,
    MaterialCategory,
} from '@/types/database';

interface StudentDashboardProps {
    user: AppUser;
    ledger: StudentLedger | null;
    submissions: Submission[];
    settings: SystemSettings;
    materials: MaterialCategory[];
}

export default function StudentDashboard({
                                             user,
                                             ledger,
                                             submissions,
                                             settings,
                                             materials,
                                         }: StudentDashboardProps) {
    const [feedback, setFeedback] = useState<{
        type: 'success' | 'error';
        text: string;
    } | null>(null);
    const [isPending, startTransition] = useTransition();

    const materialMap = new Map(materials.map((m) => [m.id, m.name]));

    const handleLinkStudentId = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setFeedback(null);
        const formData = new FormData(e.currentTarget);

        startTransition(async () => {
            const res = await linkStudentIdAction(formData);
            setFeedback({
                type: res.success ? 'success' : 'error',
                text: res.message,
            });
        });
    };

    const handleUpdatePrivacy = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setFeedback(null);
        const formData = new FormData(e.currentTarget);

        startTransition(async () => {
            const res = await updatePrivacySettingsAction(formData);
            setFeedback({
                type: res.success ? 'success' : 'error',
                text: res.message,
            });
        });
    };

// State 1: User is signed in, but has not linked their AIU Student ID yet
    if (!user.student_id || !ledger) {
        return (
            <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
                <div className="max-w-xl">
                    <div className="flex items-center gap-2 text-emerald-700 mb-2">
                        <LinkIcon className="w-5 h-5" />
                        <h2 className="text-lg font-bold text-slate-900">
                            One-Time AIU Student ID Verification
                        </h2>
                    </div>
                    <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                        Bind your institutional AIU Student ID once to generate your Personal SP Corner
                        QR Pass. If a station volunteer has already logged drop-offs for your Student ID
                        at the hostel booth, your historical weights and rewards will sync automatically.
                    </p>

                    {feedback && (
                        <div
                            className={`mb-4 p-3 rounded-lg border text-xs flex items-center gap-2 ${
                                feedback.type === 'success'
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                    : 'bg-rose-50 border-rose-200 text-rose-800'
                            }`}
                        >
                            {feedback.type === 'success' ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            ) : (
                                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                            )}
                            <span>{feedback.text}</span>
                        </div>
                    )}

                    <form onSubmit={handleLinkStudentId} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    AIU Student ID (Required)
                                </label>
                                <input
                                    type="text"
                                    name="student_id"
                                    required
                                    placeholder="e.g. AIU21042821"
                                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-sm font-mono uppercase text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:bg-white"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Public Display Nickname (Optional)
                                </label>
                                <input
                                    type="text"
                                    name="display_name"
                                    maxLength={24}
                                    placeholder="Leave blank for masked ID"
                                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:bg-white"
                                />
                            </div>
                        </div>

                        <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                            <input
                                type="checkbox"
                                name="hall_of_fame_opt_in"
                                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-600"
                            />
                            <span>
                                Opt-in to the Tier 2 Campus Hall of Fame Leaderboard (Section 3 Recognition)
                            </span>
                        </label>

                        <button
                            type="submit"
                            disabled={isPending}
                            className="px-5 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-semibold transition-colors cursor-pointer"
                        >
                            {isPending ? 'Binding Student ID...' : 'Verify & Generate My QR Pass'}
                        </button>
                    </form>
                </div>
            </section>
        );
    }

    // State 2: Linked Student Dashboard
    const targetSubmissions = Number(settings.tier1_target_submissions);
    const completedSubmissions = Number(ledger.verified_submissions_count);
    const progressPercent = Math.min(
        100,
        Math.round((completedSubmissions / targetSubmissions) * 100)
    );
    const minThresholdKg = Number(settings.min_qualifying_kg);
    const pendingKg = Number(ledger.pending_weight_kg);
    const isMultiplierActive =
        ledger.multiplier_expires_at !== null &&
        new Date(ledger.multiplier_expires_at) > new Date();

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Column 1: Digital QR Pass for Volunteer Scanning */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col items-center justify-between text-center">
                    <div className="w-full flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                        <div className="flex items-center gap-2 text-emerald-700">
                            <QrCode className="w-4 h-4" />
                            <span className="text-xs font-bold uppercase tracking-wider">
                Station Check-In Pass
              </span>
                        </div>
                        <span className="text-xs font-mono font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
              {ledger.student_id}
            </span>
                    </div>

                    <div className="p-4 bg-white rounded-xl border-2 border-slate-200 shadow-xs my-2">
                        <QRCodeSVG value={ledger.student_id} size={168} level="M" />
                    </div>

                    <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                        Show this QR code to the Station Volunteer during twice-weekly hostel collection
                        sessions for instant scale logging.
                    </p>
                </div>

                {/* Column 2 & 3: Personal Impact Metrics & Tier 1 Milestone Progression */}
                <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col justify-between space-y-6">
                    <div>
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                            <h2 className="text-base font-bold text-slate-900">
                                Personal Sustainability Impact & Buy-Back Ledger
                            </h2>
                            {isMultiplierActive && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>1.5x Tier 1 Multiplier Active</span>
                </span>
                            )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                                <div className="flex items-center justify-between text-slate-600 text-xs font-medium mb-1">
                                    <span>Available Balance</span>
                                    <Wallet className="w-4 h-4 text-emerald-600" />
                                </div>
                                <p className="text-2xl font-bold text-slate-900 font-mono">
                                    {Number(ledger.reward_balance).toFixed(2)}{' '}
                                    <span className="text-xs font-sans font-semibold text-emerald-700">
                    {settings.currency_label}
                  </span>
                                </p>
                                <p className="text-[11px] text-slate-500 mt-1">
                                    Lifetime earned: {Number(ledger.total_reward_earned).toFixed(2)}{' '}
                                    {settings.currency_label}
                                </p>
                            </div>

                            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                                <div className="flex items-center justify-between text-slate-600 text-xs font-medium mb-1">
                                    <span>Total Recycled</span>
                                    <Scale className="w-4 h-4 text-sky-600" />
                                </div>
                                <p className="text-2xl font-bold text-slate-900 font-mono">
                                    {Number(ledger.total_weight_kg).toFixed(2)}{' '}
                                    <span className="text-xs font-sans font-semibold text-sky-700">kg</span>
                                </p>
                                <p className="text-[11px] text-slate-500 mt-1">
                                    Rollover bucket: {pendingKg.toFixed(2)} / {minThresholdKg.toFixed(2)} kg
                                </p>
                            </div>

                            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                                <div className="flex items-center justify-between text-slate-600 text-xs font-medium mb-1">
                                    <span>Estimated CO2 Saved</span>
                                    <Leaf className="w-4 h-4 text-emerald-600" />
                                </div>
                                <p className="text-2xl font-bold text-slate-900 font-mono">
                                    {Number(ledger.total_co2_saved_kg).toFixed(2)}{' '}
                                    <span className="text-xs font-sans font-semibold text-emerald-700">
                    kg CO2
                  </span>
                                </p>
                                <p className="text-[11px] text-slate-500 mt-1">
                                    Verified net diversion impact
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Tier 1 Consistency Milestone Progress Bar */}
                    <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200/80">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                                <Award className="w-4 h-4 text-amber-600" />
                                <span className="text-xs font-bold text-slate-800">
                  Tier 1 Consistency Milestone ({completedSubmissions} / {targetSubmissions}{' '}
                                    Verified Submissions)
                </span>
                            </div>
                            <span className="text-xs font-mono font-bold text-emerald-700">
                {progressPercent}%
              </span>
                        </div>

                        <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-emerald-600 transition-all duration-300"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>

                        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
              <span>
                Drop-offs under {minThresholdKg.toFixed(2)} kg aggregate automatically in your
                rollover bucket ({pendingKg.toFixed(2)} kg pending).
              </span>
                            {ledger.tier1_unlocked_at && (
                                <span className="text-amber-800 font-semibold">
                  {ledger.tier1_merch_claimed
                      ? 'Tier 1 Merch Claimed'
                      : 'Tier 1 Merch Ready for Pickup at Booth!'}
                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* PDPA Privacy Controls & Recent Submissions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
                    <div className="flex items-center gap-2 text-slate-900 mb-2">
                        <Shield className="w-4 h-4 text-emerald-700" />
                        <h3 className="text-sm font-bold">PDPA Anonymity Settings</h3>
                    </div>
                    <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                        Your full Student ID is never shown publicly. Choose an optional display nickname
                        or leave blank to appear as{' '}
                        <span className="font-mono font-semibold text-slate-800">
              {ledger.student_id.slice(0, 3)}****{ledger.student_id.slice(-3)}
            </span>
                        .
                    </p>

                    {feedback && (
                        <div
                            className={`mb-3 p-2.5 rounded-lg border text-xs flex items-center gap-2 ${
                                feedback.type === 'success'
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                    : 'bg-rose-50 border-rose-200 text-rose-800'
                            }`}
                        >
                            <span>{feedback.text}</span>
                        </div>
                    )}

                    <form onSubmit={handleUpdatePrivacy} className="space-y-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Public Leaderboard Nickname
                            </label>
                            <input
                                type="text"
                                name="display_name"
                                defaultValue={ledger.display_name ?? ''}
                                maxLength={24}
                                placeholder="Default: Masked AIU ID"
                                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
                            />
                        </div>

                        <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                            <input
                                type="checkbox"
                                name="hall_of_fame_opt_in"
                                defaultChecked={ledger.hall_of_fame_opt_in}
                                className="rounded border-slate-300 text-emerald-600"
                            />
                            <span>Opt-in to Tier 2 Hall of Fame recognition</span>
                        </label>

                        <button
                            type="submit"
                            disabled={isPending}
                            className="w-full py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-white transition-colors cursor-pointer"
                        >
                            {isPending ? 'Saving...' : 'Save Privacy Preferences'}
                        </button>
                    </form>
                </div>

                {/* Personal Verified Submission Log */}
                <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-emerald-700" />
                            <h3 className="text-sm font-bold text-slate-900">
                                Personal Verified Submission History
                            </h3>
                        </div>
                        <span className="text-xs font-medium text-slate-500">
              {submissions.length} records
            </span>
                    </div>

                    {submissions.length === 0 ? (
                        <div className="text-center py-8 border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
                            <p className="text-xs text-slate-500">
                                No recycling submissions recorded yet. Bring your sorted recyclables to the
                                hostel station and scan your QR pass!
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                <tr className="border-b border-slate-200 text-slate-500">
                                    <th className="py-2 pr-3 font-semibold">Date</th>
                                    <th className="py-2 px-3 font-semibold">Material Stream</th>
                                    <th className="py-2 px-3 font-semibold text-right">Net Weight</th>
                                    <th className="py-2 px-3 font-semibold text-right">CO2 Offset</th>
                                    <th className="py-2 pl-3 font-semibold text-right">Reward Accrued</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-700">
                                {submissions.map((sub) => (
                                    <tr key={sub.id} className="hover:bg-slate-50/80">
                                        <td className="py-2.5 pr-3 font-mono text-[11px] text-slate-500">
                                            {sub.session_date}
                                        </td>
                                        <td className="py-2.5 px-3 font-medium text-slate-900">
                                            {materialMap.get(sub.material_id) ?? sub.material_id}
                                        </td>
                                        <td className="py-2.5 px-3 text-right font-mono">
                                            {Number(sub.weight_kg).toFixed(2)} kg
                                        </td>
                                        <td className="py-2.5 px-3 text-right font-mono text-emerald-700 font-medium">
                                            {Number(sub.co2_saved_kg).toFixed(2)} kg
                                        </td>
                                        <td className="py-2.5 pl-3 text-right font-mono font-bold text-slate-900">
                                            +{Number(sub.reward_earned).toFixed(2)} {settings.currency_label}
                                            {Number(sub.multiplier_applied) > 1 && (
                                                <span className="ml-1 text-[10px] text-amber-700">
                            ({Number(sub.multiplier_applied)}x)
                          </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}