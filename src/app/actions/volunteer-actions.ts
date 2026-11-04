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
 * Logs a verified recycling submission.
 * V2.0 Logic: 100g minimum per drop. Evaluates cumulative Level 1, 2, and 3 milestones.
 */
export async function logSubmissionAction(formData: FormData): Promise<ActionResponse> {
    const auth = await verifyStaffCaller();
    if (!auth.authorized) {
        return { success: false, message: auth.message };
    }

    const { adminDb, userId } = auth;

    const rawStudentId = String(formData.get('student_id') ?? '').trim().toUpperCase();
    const materialId = String(formData.get('material_id') ?? '').trim();
    const weightKg = Number(formData.get('weight_kg'));

    const aiuIdPattern = /^AIU[A-Z0-9]{4,12}$/;
    if (!aiuIdPattern.test(rawStudentId)) {
        return { success: false, message: 'Invalid Student ID. Must start with AIU (e.g., AIU24102323).' };
    }

    const [{ data: settings }, { data: material }] = await Promise.all([
        adminDb.from('system_settings').select('*').eq('id', 1).single(),
        adminDb.from('material_categories').select('*').eq('id', materialId).eq('is_active', true).maybeSingle(),
    ]);

    if (!settings || !material) {
        return { success: false, message: 'System settings or material category not found.' };
    }

    // V2.0 Constraint: 100g minimum to register an entry
    const minQualifyingKg = Number(settings.min_qualifying_kg);
    if (Number.isNaN(weightKg) || weightKg < minQualifyingKg || weightKg > 40) {
        return {
            success: false,
            message: `Invalid weight. Minimum drop is ${minQualifyingKg.toFixed(2)} kg.`,
        };
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
            return { success: false, message: `Could not initialize student record: ${createError?.message}` };
        }
        student = createdStudent;
    }

    const now = new Date();
    const todayDateStr = now.toISOString().split('T')[0];

    // V2.0: Multiplier is unlocked at Level 2
    const isMultiplierActive = student.multiplier_expires_at !== null && new Date(student.multiplier_expires_at) > now;
    const appliedMultiplier = isMultiplierActive ? Number(settings.level_2_multiplier) : 1.0;

    const co2SavedKg = Number((weightKg * Number(material.co2_per_kg)).toFixed(2));
    const rewardEarned = Number((weightKg * Number(material.base_rate_per_kg) * appliedMultiplier).toFixed(2));

    let newVerifiedCount = Number(student.verified_submissions_count);
    let newLastQualifyingDate = student.last_qualifying_session_date;
    let statusNote = '';

    // Anti-Cheat: Max 1 verified drop count per day
    if (student.last_qualifying_session_date !== todayDateStr) {
        newVerifiedCount += 1;
        newLastQualifyingDate = todayDateStr;
    } else {
        statusNote = ' (Daily drop limit reached; weight/rewards added but drop count unchanged)';
    }

    const newTotalWeightKg = Number((Number(student.total_weight_kg) + weightKg).toFixed(2));
    const newBalance = Number((Number(student.reward_balance) + rewardEarned).toFixed(2));

    // V2.0: Evaluate 3-Level Milestones
    let newLevel1At = student.level_1_unlocked_at;
    let newLevel2At = student.level_2_unlocked_at;
    let newLevel3At = student.level_3_unlocked_at;
    let newMultiplierExpiresAt = student.multiplier_expires_at;

    let justUnlocked1 = false;
    let justUnlocked2 = false;
    let justUnlocked3 = false;

    if (!newLevel1At && newVerifiedCount >= Number(settings.level_1_target_drops) && newTotalWeightKg >= Number(settings.level_1_min_kg)) {
        newLevel1At = now.toISOString();
        justUnlocked1 = true;
    }

    if (!newLevel2At && newVerifiedCount >= Number(settings.level_2_target_drops) && newTotalWeightKg >= Number(settings.level_2_min_kg)) {
        newLevel2At = now.toISOString();
        const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        newMultiplierExpiresAt = sevenDaysLater.toISOString();
        justUnlocked2 = true;
    }

    if (!newLevel3At && newVerifiedCount >= Number(settings.level_3_target_drops) && newTotalWeightKg >= Number(settings.level_3_min_kg)) {
        newLevel3At = now.toISOString();
        justUnlocked3 = true;
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

    const { error: updateStudentError } = await adminDb
        .from('students')
        .update({
            verified_submissions_count: newVerifiedCount,
            last_qualifying_session_date: newLastQualifyingDate,
            level_1_unlocked_at: newLevel1At,
            level_2_unlocked_at: newLevel2At,
            multiplier_expires_at: newMultiplierExpiresAt,
            level_3_unlocked_at: newLevel3At,
            total_weight_kg: newTotalWeightKg,
            total_co2_saved_kg: Number((Number(student.total_co2_saved_kg) + co2SavedKg).toFixed(2)),
            reward_balance: newBalance,
            total_reward_earned: Number((Number(student.total_reward_earned) + rewardEarned).toFixed(2)),
        })
        .eq('student_id', rawStudentId);

    if (updateStudentError) {
        return { success: false, message: `Failed to update ledger: ${updateStudentError.message}` };
    }

    // Dispatch Notifications
    await adminDb.from('notifications').insert({
        student_id: rawStudentId,
        title: `Verified Drop-Off: +${rewardEarned.toFixed(2)} ${settings.currency_label}`,
        message: `Logged ${weightKg.toFixed(2)} kg of ${material.name}. Available balance: ${newBalance.toFixed(2)} ${settings.currency_label}.`,
        category: 'submission',
    });

    if (justUnlocked1) {
        await adminDb.from('notifications').insert({
            student_id: rawStudentId,
            title: 'Level 1: Milestone Starter Unlocked!',
            message: 'You have reached 3 drops and 0.6kg! Your branded SP Sticker/Pin is ready for pickup at the booth.',
            category: 'milestone',
        });
    }
    if (justUnlocked2) {
        await adminDb.from('notifications').insert({
            student_id: rawStudentId,
            title: 'Level 2: Monthly Eco-Leader Unlocked!',
            message: 'You have reached 6 drops and 2.0kg! Your 1-Week 1.5x Multiplier is now active, and your Tote Bag is ready for pickup!',
            category: 'milestone',
        });
    }
    if (justUnlocked3) {
        await adminDb.from('notifications').insert({
            student_id: rawStudentId,
            title: 'Level 3: Certified Pioneer Unlocked!',
            message: 'Incredible! You reached 12 drops and 4.5kg. Your Official Digital Certificate and SP T-Shirt have been unlocked.',
            category: 'milestone',
        });
    }

    revalidatePath('/');
    return {
        success: true,
        message: `Logged ${weightKg.toFixed(2)} kg for ${rawStudentId} (+${rewardEarned.toFixed(2)} ${settings.currency_label}).${statusNote}`,
    };
}

/**
 * Records a reward redemption or marks Level 1/2/3 Merchandise as claimed.
 */
export async function redeemStudentRewardAction(formData: FormData): Promise<ActionResponse> {
    const auth = await verifyStaffCaller();
    if (!auth.authorized) {
        return { success: false, message: auth.message };
    }

    const { adminDb, userId } = auth;
    const rawStudentId = String(formData.get('student_id') ?? '').trim().toUpperCase();
    const redemptionType = String(formData.get('redemption_type') ?? 'cash_claim');
    const amountToDeduct = Number(formData.get('amount') ?? 0);
    const notes = String(formData.get('notes') ?? '').trim();

    const [{ data: student }, { data: settings }] = await Promise.all([
        adminDb.from('students').select('*').eq('student_id', rawStudentId).maybeSingle(),
        adminDb.from('system_settings').select('currency_label').eq('id', 1).single(),
    ]);

    if (!student) return { success: false, message: `Student ${rawStudentId} not found.` };
    const currencyLabel = settings?.currency_label ?? 'Pts';

    // Handle Merch Claims for the 3 Levels
    if (redemptionType.endsWith('_merch')) {
        const levelMap: Record<string, { unlocked: string | null, claimed: boolean, column: string, label: string }> = {
            'level_1_merch': { unlocked: student.level_1_unlocked_at, claimed: student.level_1_reward_claimed, column: 'level_1_reward_claimed', label: 'Level 1 Starter Pin' },
            'level_2_merch': { unlocked: student.level_2_unlocked_at, claimed: student.level_2_reward_claimed, column: 'level_2_reward_claimed', label: 'Level 2 Tote Bag' },
            'level_3_merch': { unlocked: student.level_3_unlocked_at, claimed: student.level_3_reward_claimed, column: 'level_3_reward_claimed', label: 'Level 3 T-Shirt & Certificate' },
        };

        const targetLevel = levelMap[redemptionType];
        if (!targetLevel) return { success: false, message: 'Invalid merchandise level.' };

        if (!targetLevel.unlocked) return { success: false, message: `${rawStudentId} has not unlocked this level yet.` };
        if (targetLevel.claimed) return { success: false, message: `${rawStudentId} already claimed this merchandise.` };

        await adminDb.from('students').update({ [targetLevel.column]: true }).eq('student_id', rawStudentId);

        await adminDb.from('payout_logs').insert({
            student_id: rawStudentId,
            amount_deducted: 0,
            action_type: 'merch_claim',
            notes: notes || `${targetLevel.label} handed out at booth`,
            processed_by: userId,
        });

        await adminDb.from('notifications').insert({
            student_id: rawStudentId,
            title: 'Merchandise Claimed',
            message: `Your ${targetLevel.label} reward has been handed out at the station.`,
            category: 'payout',
        });

        revalidatePath('/');
        return { success: true, message: `${targetLevel.label} marked as claimed for ${rawStudentId}.` };
    }

    // Standard Cash/Points Balance Redemption
    const currentBalance = Number(student.reward_balance);
    if (Number.isNaN(amountToDeduct) || amountToDeduct <= 0 || amountToDeduct > currentBalance) {
        return { success: false, message: `Invalid redemption amount. Available balance is ${currentBalance.toFixed(2)}.` };
    }

    const newBalance = Number((currentBalance - amountToDeduct).toFixed(2));

    const { error: updateErr } = await adminDb.from('students').update({ reward_balance: newBalance }).eq('student_id', rawStudentId);
    if (updateErr) return { success: false, message: updateErr.message };

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
        message: `Your booth redemption of ${amountToDeduct.toFixed(2)} ${currencyLabel} was processed. Remaining balance: ${newBalance.toFixed(2)} ${currencyLabel}.`,
        category: 'payout',
    });

    revalidatePath('/');
    return { success: true, message: `Deducted ${amountToDeduct.toFixed(2)} from ${rawStudentId}. Remaining balance: ${newBalance.toFixed(2)}.` };
}