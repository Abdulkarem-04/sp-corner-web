'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server';
import type { ActionResponse } from './auth-actions';
import type { CurrencyMode, UserRole } from '@/types/database';

async function verifyAdminCaller() {
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

    if (!callerProfile || callerProfile.role !== 'admin') {
        return {
            authorized: false as const,
            message: 'Restricted: Project Lead (Admin) privileges required.',
        };
    }

    return { authorized: true as const, userId: callerProfile.id, adminDb };
}

/**
 * Allows the Project Lead to switch currency mode (POINTS vs RM) and update material buy-back rates.
 */
export async function updateSystemAndRatesAction(formData: FormData): Promise<ActionResponse> {
    const auth = await verifyAdminCaller();
    if (!auth.authorized) {
        return { success: false, message: auth.message };
    }

    const { adminDb } = auth;
    const currencyMode = (formData.get('currency_mode') as CurrencyMode) || 'POINTS';
    const currencyLabel = currencyMode === 'RM' ? 'RM' : 'Pts';
    const minQualifyingKg = Number(formData.get('min_qualifying_kg') ?? 0.5);

    if (Number.isNaN(minQualifyingKg) || minQualifyingKg < 0.1 || minQualifyingKg > 10) {
        return {
            success: false,
            message: 'Minimum qualifying threshold must be between 0.10 kg and 10.00 kg.',
        };
    }

    const { error: settingsError } = await adminDb
        .from('system_settings')
        .update({
            currency_mode: currencyMode,
            currency_label: currencyLabel,
            min_qualifying_kg: minQualifyingKg,
            updated_at: new Date().toISOString(),
        })
        .eq('id', 1);

    if (settingsError) {
        return { success: false, message: settingsError.message };
    }

    const materialIds = ['plastic', 'cans', 'paper', 'ewaste'];
    for (const id of materialIds) {
        const rateVal = formData.get(`rate_${id}`);
        const co2Val = formData.get(`co2_${id}`);

        if (rateVal !== null && co2Val !== null) {
            const parsedRate = Number(rateVal);
            const parsedCo2 = Number(co2Val);
            if (
                !Number.isNaN(parsedRate) &&
                parsedRate >= 0 &&
                !Number.isNaN(parsedCo2) &&
                parsedCo2 >= 0
            ) {
                await adminDb
                    .from('material_categories')
                    .update({
                        base_rate_per_kg: parsedRate,
                        co2_per_kg: parsedCo2,
                    })
                    .eq('id', id);
            }
        }
    }

    revalidatePath('/');
    return {
        success: true,
        message: `System configuration and material rates updated (${currencyMode} mode).`,
    };
}

/**
 * Allows the Project Lead to assign Volunteer or Admin roles to registered users.
 */
export async function updateUserRoleAction(formData: FormData): Promise<ActionResponse> {
    const auth = await verifyAdminCaller();
    if (!auth.authorized) {
        return { success: false, message: auth.message };
    }

    const { adminDb } = auth;
    const targetEmail = String(formData.get('email') ?? '')
        .trim()
        .toLowerCase();
    const newRole = String(formData.get('role') ?? 'student') as UserRole;

    if (!['student', 'volunteer', 'admin'].includes(newRole)) {
        return { success: false, message: 'Invalid role selected.' };
    }

    const { data: targetUser, error } = await adminDb
        .from('app_users')
        .update({ role: newRole })
        .eq('email', targetEmail)
        .select('email, role')
        .maybeSingle();

    if (error || !targetUser) {
        return {
            success: false,
            message: `User with email ${targetEmail} not found. Ask them to sign in once first.`,
        };
    }

    revalidatePath('/');
    return {
        success: true,
        message: `Updated role for ${targetUser.email} to ${targetUser.role.toUpperCase()}.`,
    };
}

/**
 * Allows the Project Lead (Fatimah) to broadcast a Campus Collection Session Notification
 * to all students (or to a specific Student ID).
 */
export async function broadcastNotificationAction(formData: FormData): Promise<ActionResponse> {
    const auth = await verifyAdminCaller();
    if (!auth.authorized) {
        return { success: false, message: auth.message };
    }

    const { adminDb } = auth;
    const title = String(formData.get('title') ?? '').trim();
    const message = String(formData.get('message') ?? '').trim();
    const rawTargetStudentId = String(formData.get('target_student_id') ?? '')
        .trim()
        .toUpperCase();

    if (!title || !message) {
        return { success: false, message: 'Notification title and message are required.' };
    }

    const targetStudentId = rawTargetStudentId.length > 0 ? rawTargetStudentId : null;

    const { error } = await adminDb.from('notifications').insert({
        student_id: targetStudentId,
        title,
        message,
        category: 'broadcast',
    });

    if (error) {
        return { success: false, message: `Failed to send notification: ${error.message}` };
    }

    revalidatePath('/');
    return {
        success: true,
        message: targetStudentId
            ? `Direct notification sent to ${targetStudentId}.`
            : 'Campus-wide broadcast notification published to all students!',
    };
}

/**
 * Marks personal notifications as read for the currently authenticated student.
 */
export async function markNotificationsReadAction(): Promise<void> {
    const supabase = await createSupabaseServerClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const adminDb = createSupabaseAdminClient();
    const { data: appUser } = await adminDb
        .from('app_users')
        .select('student_id')
        .eq('id', user.id)
        .maybeSingle();

    if (appUser?.student_id) {
        await adminDb
            .from('notifications')
            .update({ is_read: true })
            .eq('student_id', appUser.student_id)
            .eq('is_read', false);
    }

    revalidatePath('/');
}