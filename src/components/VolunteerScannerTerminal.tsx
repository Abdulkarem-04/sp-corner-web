'use client';

import React, { useState, useTransition } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import {
    Camera,
    CameraOff,
    Scale,
    CheckCircle2,
    AlertCircle,
    Wallet,
    Award,
    Sparkles,
    Search,
    ArrowRight,
} from 'lucide-react';
import {
    logSubmissionAction,
    redeemStudentRewardAction,
} from '@/app/actions/volunteer-actions';
import type { MaterialCategory, StudentLedger, SystemSettings } from '@/types/database';

interface VolunteerScannerTerminalProps {
    materials: MaterialCategory[];
    settings: SystemSettings;
    allStudents: StudentLedger[];
}

export default function VolunteerScannerTerminal({ materials, settings, allStudents }: VolunteerScannerTerminalProps) {
    const [activeTab, setActiveTab] = useState<'weigh' | 'redeem'>('weigh');
    const [scannerOpen, setScannerOpen] = useState(false);
    const [studentId, setStudentId] = useState('');
    const [selectedMaterialId, setSelectedMaterialId] = useState(materials[0]?.id ?? 'plastic');
    const [weightInput, setWeightInput] = useState('');

    const [redeemType, setRedeemType] = useState('cash_claim');
    const [redeemAmount, setRedeemAmount] = useState('');
    const [redeemNotes, setRedeemNotes] = useState('');

    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [isPending, startTransition] = useTransition();

    const normalizedId = studentId.trim().toUpperCase();
    const matchedStudent = allStudents.find((s) => s.student_id === normalizedId) ?? null;
    const selectedMaterial = materials.find((m) => m.id === selectedMaterialId) ?? materials[0];

    const isMultiplierActive = matchedStudent?.multiplier_expires_at !== null && matchedStudent?.multiplier_expires_at !== undefined && new Date(matchedStudent.multiplier_expires_at) > new Date();
    const appliedMultiplier = isMultiplierActive ? Number(settings.level_2_multiplier) : 1.0;

    const numericWeight = Number(weightInput);
    const estimatedReward = !Number.isNaN(numericWeight) && numericWeight > 0 && selectedMaterial ? (numericWeight * Number(selectedMaterial.base_rate_per_kg) * appliedMultiplier).toFixed(2) : '0.00';
    const estimatedCo2 = !Number.isNaN(numericWeight) && numericWeight > 0 && selectedMaterial ? (numericWeight * Number(selectedMaterial.co2_per_kg)).toFixed(2) : '0.00';

    const handleQrScan = (detectedCodes: Array<{ rawValue?: string }>) => {
        if (!Array.isArray(detectedCodes) || detectedCodes.length === 0) return;
        const rawValue = String(detectedCodes[0]?.rawValue ?? '').trim();
        if (!rawValue) return;

        if (rawValue.toLowerCase().includes('aiu.edu.my')) {
            setScannerOpen(false);
            setFeedback({ type: 'error', text: 'Physical AIU Card barcode detected. Please scan the student Digital QR Pass.' });
            return;
        }

        setStudentId(rawValue.toUpperCase());
        setScannerOpen(false);
        setFeedback({ type: 'success', text: `Scanned Student ID: ${rawValue.toUpperCase()}` });
    };

    const handleLogWeight = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setFeedback(null);
        startTransition(async () => {
            const res = await logSubmissionAction(new FormData(e.currentTarget));
            setFeedback({ type: res.success ? 'success' : 'error', text: res.message });
            if (res.success) setWeightInput('');
        });
    };

    const handleRedeem = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setFeedback(null);
        const formData = new FormData();
        formData.set('student_id', normalizedId);
        formData.set('redemption_type', redeemType);
        if (redeemType === 'cash_claim') formData.set('amount', redeemAmount);
        formData.set('notes', redeemNotes);

        startTransition(async () => {
            const res = await redeemStudentRewardAction(formData);
            setFeedback({ type: res.success ? 'success' : 'error', text: res.message });
            if (res.success) {
                setRedeemAmount('');
                setRedeemNotes('');
            }
        });
    };

    return (
        <section className="bg-white border-2 border-emerald-600/20 rounded-xl p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4 mb-6">
                <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Station Volunteer Operations</span>
                    <h2 className="text-lg font-bold text-slate-900">Mobile QR Scanner & Scale Verification Terminal</h2>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200">
                    <button type="button" onClick={() => setActiveTab('weigh')} className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${activeTab === 'weigh' ? 'bg-emerald-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}>1. Weigh & Log Drop-Off</button>
                    <button type="button" onClick={() => setActiveTab('redeem')} className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${activeTab === 'redeem' ? 'bg-emerald-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}>2. Booth Payout & Merch</button>
                </div>
            </div>

            {feedback && (
                <div className={`mb-6 p-3.5 rounded-lg border text-xs flex items-start gap-2.5 ${feedback.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'}`}>
                    {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />}
                    <span className="leading-relaxed font-medium">{feedback.text}</span>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-5 space-y-4">
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold text-slate-800">Step 1: Authenticate Student ID</span>
                            <button type="button" onClick={() => setScannerOpen(!scannerOpen)} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${scannerOpen ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'}`}>
                                {scannerOpen ? <><CameraOff className="w-3.5 h-3.5" /><span>Close Camera</span></> : <><Camera className="w-3.5 h-3.5" /><span>Scan QR Pass</span></>}
                            </button>
                        </div>

                        {scannerOpen && (
                            <div className="mb-4 rounded-lg overflow-hidden border border-slate-300 bg-black aspect-square max-w-[260px] mx-auto">
                                <Scanner onScan={handleQrScan} onError={(err) => console.error(err)} />
                            </div>
                        )}

                        <div className="relative">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                            <input type="text" value={studentId} onChange={(e) => setStudentId(e.target.value.toUpperCase())} list="existing-aiu-students" placeholder="Scan QR or type ID" className="w-full pl-9 pr-3 py-2 rounded-lg bg-white border border-slate-300 text-sm font-mono uppercase text-slate-900 focus:outline-none focus:border-emerald-600" />
                            <datalist id="existing-aiu-students">
                                {allStudents.map((st) => <option key={st.student_id} value={st.student_id}>{st.display_name ? `${st.student_id} (${st.display_name})` : st.student_id}</option>)}
                            </datalist>
                        </div>

                        {normalizedId.length >= 6 && (
                            <div className="mt-4 p-3.5 rounded-lg bg-white border border-slate-200 text-xs space-y-1.5 shadow-2xs">
                                {matchedStudent ? (
                                    <>
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-500">Student Status:</span>
                                            <span className="font-bold text-emerald-700">Registered ({matchedStudent.verified_submissions_count} Drops)</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-500">Available Balance:</span>
                                            <span className="font-mono font-bold text-slate-900">{Number(matchedStudent.reward_balance).toFixed(2)} {settings.currency_label}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-500">Total Recycled:</span>
                                            <span className="font-mono font-semibold text-sky-700">{Number(matchedStudent.total_weight_kg).toFixed(2)} kg</span>
                                        </div>
                                        {isMultiplierActive && (
                                            <div className="pt-1 flex items-center gap-1.5 text-amber-700 font-semibold">
                                                <Sparkles className="w-3.5 h-3.5" />
                                                <span>Active 1.5x Level 2 Multiplier applied automatically</span>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <p className="text-slate-600">New Student ID <span className="font-mono font-bold text-slate-900">{normalizedId}</span>.</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="lg:col-span-7">
                    {activeTab === 'weigh' ? (
                        <form onSubmit={handleLogWeight} className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-5">
                            <input type="hidden" name="student_id" value={normalizedId} />
                            <input type="hidden" name="material_id" value={selectedMaterialId} />
                            <div>
                                <label className="block text-xs font-bold text-slate-800 mb-2">Step 2: Select Segregated Material Stream</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    {materials.map((mat) => (
                                        <button key={mat.id} type="button" onClick={() => setSelectedMaterialId(mat.id)} className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${mat.id === selectedMaterialId ? 'bg-emerald-50 border-emerald-600 text-slate-900 ring-1 ring-emerald-600' : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'}`}>
                                            <div className="text-xs font-bold">{mat.name}</div>
                                            <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                                                <span>Rate: {Number(mat.base_rate_per_kg).toFixed(2)} {settings.currency_label}/kg</span>
                                                <span className="text-emerald-700 font-medium">{Number(mat.co2_per_kg).toFixed(1)} kg CO2/kg</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                                <div>
                                    <label className="block text-xs font-bold text-slate-800 mb-1">Step 3: Net Scale Weight (kg)</label>
                                    <div className="relative">
                                        <Scale className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                                        <input type="number" name="weight_kg" step="0.01" min={Number(settings.min_qualifying_kg).toFixed(2)} max="40.00" required value={weightInput} onChange={(e) => setWeightInput(e.target.value)} placeholder={`Min ${Number(settings.min_qualifying_kg).toFixed(2)}`} className="w-full pl-9 pr-3 py-2 rounded-lg bg-white border border-slate-300 text-sm font-mono text-slate-900 focus:outline-none focus:border-emerald-600" />
                                    </div>
                                </div>
                                <div className="p-3 rounded-lg bg-white border border-slate-200 flex items-center justify-between">
                                    <div>
                                        <span className="block text-[11px] text-slate-500">Calculated Reward ({appliedMultiplier}x)</span>
                                        <span className="text-base font-mono font-bold text-emerald-700">+{estimatedReward} {settings.currency_label}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="block text-[11px] text-slate-500">CO2 Saved</span>
                                        <span className="text-xs font-mono font-semibold text-slate-800">{estimatedCo2} kg</span>
                                    </div>
                                </div>
                            </div>
                            <button type="submit" disabled={isPending || !normalizedId} className="w-full py-3 px-4 rounded-lg bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer">
                                <span>{isPending ? 'Recording...' : `Record Verified Submission for ${normalizedId || 'Student'}`}</span>
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </form>
                    ) : (
                        <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-5">
                            <div className="flex items-center gap-2 text-emerald-700">
                                <Wallet className="w-4 h-4" />
                                <h3 className="text-sm font-bold text-slate-900">Booth Balance & Level Merchandise Redemption</h3>
                            </div>
                            <form onSubmit={handleRedeem} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Select Redemption Type</label>
                                    <select value={redeemType} onChange={(e) => setRedeemType(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-sm font-medium text-slate-900">
                                        <option value="cash_claim">Standard Cash / Points Balance Payout</option>
                                        <option value="level_1_merch">Claim Level 1 Merch (Pin/Sticker)</option>
                                        <option value="level_2_merch">Claim Level 2 Merch (Tote Bag)</option>
                                        <option value="level_3_merch">Claim Level 3 Merch (T-Shirt & Certificate)</option>
                                    </select>
                                </div>
                                {redeemType === 'cash_claim' && (
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">Amount to Deduct ({settings.currency_label})</label>
                                        <input type="number" step="0.01" min="0.01" required value={redeemAmount} onChange={(e) => setRedeemAmount(e.target.value)} placeholder="e.g. 20" className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-sm font-mono text-slate-900" />
                                    </div>
                                )}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Audit Note (Optional)</label>
                                    <input type="text" value={redeemNotes} onChange={(e) => setRedeemNotes(e.target.value)} placeholder="e.g. Paid RM 0.20 cash from float" className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-sm text-slate-900" />
                                </div>
                                <button type="submit" disabled={isPending || !matchedStudent} className="w-full py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-sm font-semibold text-white cursor-pointer">
                                    {isPending ? 'Processing...' : 'Confirm Booth Payout'}
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}