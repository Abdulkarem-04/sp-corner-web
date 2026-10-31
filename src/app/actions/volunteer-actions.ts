'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server';
import type { ActionResponse } from './auth-actions';

async function verifyStaffCaller() {
    const supabase = await createSupabaseServerClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { authorized: false as const, message: 'Authentication required.' };
    }

    const adminDb = createSupabaseAdminClient();
    const { data: callerProfile } = await adminDb
        .from('app_users')
        .select('id, role')
        .eq('id', user.id)
        .maybeSingle();

    if (!callerProfile || (callerProfile.role !== 'volunteer' && callerProfile.role !== 'admin')) {
        return {
            authorized: false as const,
            message: 'Access denied. Station Volunteer or Admin privileges required.',
        };
    }

    return { authorized: true as const, userId: callerProfile.id, role: callerProfile.role, adminDb };
}

/**
 * Logs a verified recycling submission from the Station Volunteer mobile interface
 * and dispatches an automatic personal notification to the student.
 */
export async function logSubmissionAction(formData: FormData): Promise<ActionResponse> {
    const auth = await verifyStaffCaller();
    if (!auth.authorized) {
        return { success: false, message: auth.message };
    }

    const { adminDb, userId } = auth;

    const rawStudentId = String(formData.get('student_id') ?? '')
        .trim()
        .toUpperCase();
    const materialId = String(formData.get('material_id') ?? '').trim();
    const weightKg = Number(formData.get('weight_kg'));

    const aiuIdPattern = /^AIU[A-Z0-9]{4,12}$/;
    if (!aiuIdPattern.test(rawStudentId)) {
        return {
            success: false,
            message: 'Invalid Student ID. Must start with AIU (e.g., AIU21042821).',
        };
    }

    if (Number.isNaN(weightKg) || weightKg <= 0 || weightKg > 40) {
        return {
            success: false,
            message: 'Invalid weight. Must be between 0.01 kg and 40.00 kg (max scale capacity).',
        };
    }

    const [{ data: settings }, { data: material }] = await Promise.all([
        adminDb.from('system_settings').select('*').eq('id', 1).single(),
        adminDb
            .from('material_categories')
            .select('*')
            .eq('id', materialId)
            .eq('is_active', true)
            .maybeSingle(),
    ]);

    if (!settings || !material) {
        return { success: false, message: 'Selected material category is invalid or inactive.' };
    }

    let { data: student } = await adminDb
        .from('students')
        .select('*')
        .eq('student_id', rawStudentId)
        .maybeSingle();

    if (!student) {
        const { data: createdStudent, error: createError } = await adminDb
            .from('students')
            .insert({ student_id: rawStudentId })
            .select('*')
            .single();

        if (createError || !createdStudent) {
            return {
                success: false,
                message: `Could not initialize student record: ${createError?.message}`,
            };
        }
        student = createdStudent;
    }

    const now = new Date();
    const todayDateStr = now.toISOString().split('T')[0];
    const isMultiplierActive =
        student.multiplier_expires_at !== null && new Date(student.multiplier_expires_at) > now;

    const appliedMultiplier = isMultiplierActive ? Number(settings.tier1_multiplier) : 1.0;

    const co2SavedKg = Number((weightKg * Number(material.co2_per_kg)).toFixed(2));
    const rewardEarned = Number(
        (weightKg * Number(material.base_rate_per_kg) * appliedMultiplier).toFixed(2)
    );

    const minQualifyingKg = Number(settings.min_qualifying_kg);
    const currentPendingKg = Number(student.pending_weight_kg);
    const combinedWeightKg = Number((currentPendingKg + weightKg).toFixed(2));

    let newPendingWeightKg = currentPendingKg;
    let newVerifiedCount = Number(student.verified_submissions_count);
    let newLastQualifyingDate = student.last_qualifying_session_date;
    let newTier1UnlockedAt = student.tier1_unlocked_at;
    let newMultiplierExpiresAt = student.multiplier_expires_at;
    let justUnlockedTier1 = false;
    let statusNote = '';

    if (combinedWeightKg >= minQualifyingKg) {
        newPendingWeightKg = 0;

        if (student.last_qualifying_session_date !== todayDateStr) {
            newVerifiedCount += 1;
            newLastQualifyingDate = todayDateStr;

            if (
                newVerifiedCount >= Number(settings.tier1_target_submissions) &&
                !student.tier1_unlocked_at
            ) {
                newTier1UnlockedAt = now.toISOString();
                const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                newMultiplierExpiresAt = sevenDaysLater.toISOString();
                justUnlockedTier1 = true;
                statusNote = ' [TIER 1 MILESTONE UNLOCKED: 1.5x Multiplier Activated for 7 Days!]';
            } else {
                statusNote = ` [Verified Submission #${newVerifiedCount}/${settings.tier1_target_submissions} Recorded]`;
            }
        } else {
            statusNote = ' [Weight & Reward Added - Daily milestone point already earned today]';
        }
    } else {
        newPendingWeightKg = combinedWeightKg;
        statusNote = ` [Check-in Logged: ${newPendingWeightKg.toFixed(2)}/${minQualifyingKg.toFixed(2)} kg accumulated toward next Verified Submission]`;
    }

    const { error: submissionError } = await adminDb.from('submissions').insert({
        student_id: rawStudentId,
        session_date: todayDateStr,
        material_id: material.id,
        weight_kg: weightKg,
        multiplier_applied: appliedMultiplier,
        reward_earned: rewardEarned,
        co2_saved_kg: co2SavedKg,
        logged_by: userId,
    });

    if (submissionError) {
        return { success: false, message: `Failed to log submission: ${submissionError.message}` };
    }

    const newBalance = Number((Number(student.reward_balance) + rewardEarned).toFixed(2));

    const { error: updateStudentError } = await adminDb
        .from('students')
        .update({
            pending_weight_kg: newPendingWeightKg,
            verified_submissions_count: newVerifiedCount,
            last_qualifying_session_date: newLastQualifyingDate,
            tier1_unlocked_at: newTier1UnlockedAt,
            multiplier_expires_at: newMultiplierExpiresAt,
            total_weight_kg: Number((Number(student.total_weight_kg) + weightKg).toFixed(2)),
            total_co2_saved_kg: Number((Number(student.total_co2_saved_kg) + co2SavedKg).toFixed(2)),
            reward_balance: newBalance,
            total_reward_earned: Number((Number(student.total_reward_earned) + rewardEarned).toFixed(2)),
        })
        .eq('student_id', rawStudentId);

    if (updateStudentError) {
        return {
            success: false,
            message: `Failed to update student ledger: ${updateStudentError.message}`,
        };
    }

    // Dispatch personal notification(s) to the student
    await adminDb.from('notifications').insert({
        student_id: rawStudentId,
        title: `Verified Drop-Off: +${rewardEarned.toFixed(2)} ${settings.currency_label}`,
        message: `Station volunteer recorded ${weightKg.toFixed(2)} kg of ${material.name} (${co2SavedKg.toFixed(2)} kg CO2 offset). Available balance: ${newBalance.toFixed(2)} ${settings.currency_label}.`,
        category: 'submission',
    });

    if (justUnlockedTier1) {
        await adminDb.from('notifications').insert({
            student_id: rawStudentId,
            title: 'Tier 1 Consistency Milestone Unlocked!',
            message:
                'Congratulations! You reached 10 verified submissions. Your 1-week 1.5x reward multiplier is now active and your branded SP merchandise is ready for pickup at the hostel booth.',
            category: 'milestone',
        });
    }

    revalidatePath('/');
    return {
        success: true,
        message: `Logged ${weightKg.toFixed(2)} kg of ${material.name} for ${rawStudentId} (+${rewardEarned.toFixed(2)} ${settings.currency_label}).${statusNote}`,
    };
}

/**
 * Records a reward redemption or marks Tier 1 Merchandise as claimed,
 * and dispatches a payout notification to the student.
 */
export async function redeemStudentRewardAction(formData: FormData): Promise<ActionResponse> {
    const auth = await verifyStaffCaller();
    if (!auth.authorized) {
        return { success: false, message: auth.message };
    }

    const { adminDb, userId } = auth;
    const rawStudentId = String(formData.get('student_id') ?? '')
        .trim()
        .toUpperCase();
    const redemptionType = String(formData.get('redemption_type') ?? 'cash_claim');
    const amountToDeduct = Number(formData.get('amount') ?? 0);
    const notes = String(formData.get('notes') ?? '').trim();

    const [{ data: student }, { data: settings }] = await Promise.all([
        adminDb.from('students').select('*').eq('student_id', rawStudentId).maybeSingle(),
        adminDb.from('system_settings').select('currency_label').eq('id', 1).single(),
    ]);

    const currencyLabel = settings?.currency_label ?? 'Pts';

    if (!student) {
        return { success: false, message: `Student ${rawStudentId} not found.` };
    }

    if (redemptionType === 'tier1_merch') {
        if (!student.tier1_unlocked_at) {
            return { success: false, message: `${rawStudentId} has not unlocked Tier 1 yet.` };
        }
        if (student.tier1_merch_claimed) {
            return {
                success: false,
                message: `${rawStudentId} has already claimed their Tier 1 Merchandise.`,
            };
        }

        await adminDb
            .from('students')
            .update({ tier1_merch_claimed: true })
            .eq('student_id', rawStudentId);

        await adminDb.from('payout_logs').insert({
            student_id: rawStudentId,
            amount_deducted: 0,
            action_type: 'merch_claim',
            notes: notes || 'Tier 1 Milestone Merchandise handed out at booth',
            processed_by: userId,
        });

        await adminDb.from('notifications').insert({
            student_id: rawStudentId,
            title: 'Tier 1 Milestone Merchandise Claimed',
            message: 'Your Sustainability Pioneers Tier 1 merchandise reward has been handed out and verified at the station.',
            category: 'payout',
        });

        revalidatePath('/');
        return { success: true, message: `Tier 1 Merchandise marked as claimed for ${rawStudentId}.` };
    }

    const currentBalance = Number(student.reward_balance);
    if (Number.isNaN(amountToDeduct) || amountToDeduct <= 0 || amountToDeduct > currentBalance) {
        return {
            success: false,
            message: `Invalid redemption amount. Available balance is ${currentBalance.toFixed(2)}.`,
        };
    }

    const newBalance = Number((currentBalance - amountToDeduct).toFixed(2));

    const { error: updateErr } = await adminDb
        .from('students')
        .update({ reward_balance: newBalance })
        .eq('student_id', rawStudentId);

    if (updateErr) {
        return { success: false, message: updateErr.message };
    }

    await adminDb.from('payout_logs').insert({
        student_id: rawStudentId,
        amount_deducted: amountToDeduct,
        action_type: 'cash_claim',
        notes: notes || 'Booth reward payout',
        processed_by: userId,
    });

    await adminDb.from('notifications').insert({
        student_id: rawStudentId,
        title: `Reward Redeemed: -${amountToDeduct.toFixed(2)} ${currencyLabel}`,
        message: `Your booth redemption of ${amountToDeduct.toFixed(2)} ${currencyLabel} was processed (${notes || 'Station payout'}). Remaining balance: ${newBalance.toFixed(2)} ${currencyLabel}.`,
        category: 'payout',
    });

    revalidatePath('/');
    return {
        success: true,
        message: `Deducted ${amountToDeduct.toFixed(2)} from ${rawStudentId}. Remaining balance: ${newBalance.toFixed(2)}.`,
    };
}