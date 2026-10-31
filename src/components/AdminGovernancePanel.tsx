'use client';

import React, { useState, useTransition } from 'react';
import {
    Settings,
    Users,
    Download,
    CheckCircle2,
    AlertCircle,
    ShieldAlert,
    BellRing,
    Send,
} from 'lucide-react';
import {
    updateSystemAndRatesAction,
    updateUserRoleAction,
    broadcastNotificationAction,
} from '@/app/actions/admin-actions';
import type {
    MaterialCategory,
    Submission,
    StudentLedger,
    SystemSettings,
} from '@/types/database';

interface AdminGovernancePanelProps {
    settings: SystemSettings;
    materials: MaterialCategory[];
    submissions: Submission[];
    students: StudentLedger[];
}

export default function AdminGovernancePanel({
                                                 settings,
                                                 materials,
                                                 submissions,
                                                 students,
                                             }: AdminGovernancePanelProps) {
    const [feedback, setFeedback] = useState<{
        type: 'success' | 'error';
        text: string;
    } | null>(null);
    const [isPending, startTransition] = useTransition();

    const handleSaveRates = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setFeedback(null);
        const formData = new FormData(e.currentTarget);

        startTransition(async () => {
            const res = await updateSystemAndRatesAction(formData);
            setFeedback({
                type: res.success ? 'success' : 'error',
                text: res.message,
            });
        });
    };

    const handleRoleChange = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setFeedback(null);
        const formData = new FormData(e.currentTarget);

        startTransition(async () => {
            const res = await updateUserRoleAction(formData);
            setFeedback({
                type: res.success ? 'success' : 'error',
                text: res.message,
            });
        });
    };

    const handleBroadcast = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setFeedback(null);
        const formEl = e.currentTarget;
        const formData = new FormData(formEl);

        startTransition(async () => {
            const res = await broadcastNotificationAction(formData);
            setFeedback({
                type: res.success ? 'success' : 'error',
                text: res.message,
            });
            if (res.success) {
                formEl.reset();
            }
        });
    };

    const handleExportAuditCsv = () => {
        const headers = [
            'Submission_ID',
            'Session_Date',
            'Student_ID',
            'Material_Stream',
            'Net_Weight_KG',
            'Multiplier',
            'Reward_Accrued',
            'CO2_Saved_KG',
            'Timestamp_UTC',
        ];

        const rows = submissions.map((s) => [
            s.id,
            s.session_date,
            s.student_id,
            s.material_id,
            Number(s.weight_kg).toFixed(2),
            Number(s.multiplier_applied).toFixed(2),
            Number(s.reward_earned).toFixed(2),
            Number(s.co2_saved_kg).toFixed(2),
            s.created_at,
        ]);

        const csvContent =
            'data:text/csv;charset=utf-8,' +
            [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute(
            'download',
            `sp_corner_ppk_audit_${new Date().toISOString().split('T')[0]}.csv`
        );
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <section className="bg-white border-2 border-amber-500/30 rounded-xl p-6 shadow-sm space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                    <div className="flex items-center gap-2 text-amber-700">
                        <ShieldAlert className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">
              Project Lead Governance (Section 4 Restricted)
            </span>
                    </div>
                    <h2 className="text-lg font-bold text-slate-900 mt-0.5">
                        Rate Configuration, Campus Notifications & PPK Audit Export
                    </h2>
                </div>

                <button
                    type="button"
                    onClick={handleExportAuditCsv}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-white transition-colors cursor-pointer"
                >
                    <Download className="w-4 h-4 text-emerald-400" />
                    <span>Export PPK Reconciliation CSV ({submissions.length} logs)</span>
                </button>
            </div>

            {feedback && (
                <div
                    className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                        feedback.type === 'success'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                            : 'bg-rose-50 border-rose-200 text-rose-900'
                    }`}
                >
                    {feedback.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <span className="font-medium">{feedback.text}</span>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Rate & Currency Configurator */}
                <form
                    onSubmit={handleSaveRates}
                    className="lg:col-span-2 p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-4"
                >
                    <div className="flex items-center gap-2 text-slate-900">
                        <Settings className="w-4 h-4 text-amber-600" />
                        <h3 className="text-sm font-bold">
                            Buy-Back Currency & Stream Rate Matrix
                        </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Active Reward Currency Mode
                            </label>
                            <select
                                name="currency_mode"
                                defaultValue={settings.currency_mode}
                                className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:border-emerald-600"
                            >
                                <option value="POINTS">Eco-Points Mode (Pts)</option>
                                <option value="RM">Direct Ringgit Mode (RM)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Qualifying Weight Threshold (kg)
                            </label>
                            <input
                                type="number"
                                name="min_qualifying_kg"
                                step="0.05"
                                defaultValue={Number(settings.min_qualifying_kg).toFixed(2)}
                                className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-mono text-slate-900 focus:outline-none focus:border-emerald-600"
                            />
                        </div>
                    </div>

                    <div className="space-y-2.5 pt-2">
                        <div className="grid grid-cols-12 text-[11px] font-bold text-slate-500 px-2">
                            <div className="col-span-6">Material Stream</div>
                            <div className="col-span-3">Rate / kg ({settings.currency_label})</div>
                            <div className="col-span-3">kg CO2 / kg</div>
                        </div>

                        {materials.map((mat) => (
                            <div
                                key={mat.id}
                                className="grid grid-cols-12 gap-2 items-center bg-white p-2.5 rounded-lg border border-slate-200"
                            >
                                <div className="col-span-6 text-xs font-semibold text-slate-800">
                                    {mat.name}
                                </div>
                                <div className="col-span-3">
                                    <input
                                        type="number"
                                        step="0.01"
                                        name={`rate_${mat.id}`}
                                        defaultValue={Number(mat.base_rate_per_kg)}
                                        className="w-full px-2.5 py-1 rounded bg-slate-50 border border-slate-300 text-xs font-mono text-slate-900"
                                    />
                                </div>
                                <div className="col-span-3">
                                    <input
                                        type="number"
                                        step="0.01"
                                        name={`co2_${mat.id}`}
                                        defaultValue={Number(mat.co2_per_kg)}
                                        className="w-full px-2.5 py-1 rounded bg-slate-50 border border-slate-300 text-xs font-mono text-emerald-700 font-semibold"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <button
                        type="submit"
                        disabled={isPending}
                        className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs transition-colors cursor-pointer"
                    >
                        {isPending ? 'Updating Configuration...' : 'Save Rates & Thresholds'}
                    </button>
                </form>

                {/* Right Column: Volunteer Role Assignment & Broadcast Studio */}
                <div className="space-y-4">
                    <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                        <div className="flex items-center gap-2 text-slate-900">
                            <Users className="w-4 h-4 text-amber-600" />
                            <h3 className="text-sm font-bold">Assign Station Volunteer Role</h3>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                            Grant restricted weight-logging access to station volunteers.
                        </p>

                        <form onSubmit={handleRoleChange} className="space-y-2.5">
                            <input
                                type="email"
                                name="email"
                                required
                                placeholder="volunteer@student.aiu.edu.my"
                                className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs text-slate-900"
                            />
                            <select
                                name="role"
                                defaultValue="volunteer"
                                className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-medium text-slate-900"
                            >
                                <option value="volunteer">Station Volunteer (Scanner Access)</option>
                                <option value="student">Standard Student</option>
                                <option value="admin">Project Lead (Full Admin)</option>
                            </select>
                            <button
                                type="submit"
                                disabled={isPending}
                                className="w-full py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-white cursor-pointer"
                            >
                                Update User Role
                            </button>
                        </form>
                    </div>

                    {/* Campus Broadcast Notification Studio */}
                    <form
                        onSubmit={handleBroadcast}
                        className="p-5 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-3"
                    >
                        <div className="flex items-center gap-2 text-emerald-900">
                            <BellRing className="w-4 h-4 text-emerald-700" />
                            <h3 className="text-sm font-bold">Campus Notification Broadcast</h3>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                            Send a live collection session alert to all students (or specify one AIU ID).
                        </p>

                        <input
                            type="text"
                            name="title"
                            required
                            placeholder="e.g. Hostel Station Open Now (2PM - 4PM)!"
                            className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs text-slate-900"
                        />
                        <textarea
                            name="message"
                            required
                            rows={2}
                            placeholder="Bring your segregated plastics, cans, and paper to the ground-floor station..."
                            className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs text-slate-900"
                        />
                        <input
                            type="text"
                            name="target_student_id"
                            placeholder="Optional: Single ID (leave blank for ALL)"
                            className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-mono uppercase text-slate-900"
                        />
                        <button
                            type="submit"
                            disabled={isPending}
                            className="w-full py-2 px-3 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-xs font-semibold text-white flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                            <Send className="w-3.5 h-3.5" />
                            <span>Publish Notification Alert</span>
                        </button>
                    </form>
                </div>
            </div>
        </section>
    );
}