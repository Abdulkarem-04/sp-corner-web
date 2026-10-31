'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server';
import type { UserRole } from '@/types/database';

export interface ActionResponse {
    success: boolean;
    message: string;
}

/**
 * Institutional Passwordless Sign-In.
 * Strictly preserves existing database roles and defaults new AIU users to 'student'.
 */
export async function instantInstitutionalSignInAction(
    formData: FormData
): Promise<ActionResponse> {
    const email = String(formData.get('email') ?? '')
        .trim()
        .toLowerCase();

    if (
        !email.endsWith('@student.aiu.edu.my') &&
        !email.endsWith('@aiu.edu.my')
    ) {
        return {
            success: false,
            message:
                'Restricted to Albukhary International University emails (@student.aiu.edu.my or @aiu.edu.my).',
        };
    }

    const adminDb = createSupabaseAdminClient();

    const { data: linkData, error: linkError } =
        await adminDb.auth.admin.generateLink({
            type: 'magiclink',
            email,
        });

    if (linkError || !linkData?.properties?.hashed_token) {
        return {
            success: false,
            message: linkError?.message ?? 'Failed to verify institutional account.',
        };
    }

    const supabase = await createSupabaseServerClient();
    const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: linkData.properties.hashed_token,
        type: 'magiclink',
    });

    if (verifyError || !verifyData.user) {
        return {
            success: false,
            message: verifyError?.message ?? 'Session verification failed.',
        };
    }

    const { data: existingProfile } = await adminDb
        .from('app_users')
        .select('id, role')
        .eq('id', verifyData.user.id)
        .maybeSingle();

    const assignedRole: UserRole = (existingProfile?.role as UserRole) ?? 'student';

    await adminDb.from('app_users').upsert({
        id: verifyData.user.id,
        email,
        role: assignedRole,
    });

    revalidatePath('/');
    return {
        success: true,
        message: `Signed in as ${email}.`,
    };
}

/**
 * Links the currently authenticated user to their institutional AIU Student ID.
 */
export async function linkStudentIdAction(formData: FormData): Promise<ActionResponse> {
    const supabase = await createSupabaseServerClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user || !user.email) {
        return { success: false, message: 'You must be signed in to link a Student ID.' };
    }

    const rawStudentId = String(formData.get('student_id') ?? '')
        .trim()
        .toUpperCase();
    const rawDisplayName = String(formData.get('display_name') ?? '').trim();
    const hallOfFameOptIn = formData.get('hall_of_fame_opt_in') === 'on';

    const aiuIdPattern = /^AIU[A-Z0-9]{4,12}$/;
    if (!aiuIdPattern.test(rawStudentId)) {
        return {
            success: false,
            message:
                'Invalid format. Please enter a valid AIU Student ID starting with AIU (e.g., AIU21042821).',
        };
    }

    const adminDb = createSupabaseAdminClient();

    const { data: existingClaim } = await adminDb
        .from('app_users')
        .select('id')
        .eq('student_id', rawStudentId)
        .neq('id', user.id)
        .maybeSingle();

    if (existingClaim) {
        return {
            success: false,
            message: 'This AIU Student ID is already linked to another user account.',
        };
    }

    const { data: existingStudent } = await adminDb
        .from('students')
        .select('student_id')
        .eq('student_id', rawStudentId)
        .maybeSingle();

    if (!existingStudent) {
        const { error: insertStudentError } = await adminDb.from('students').insert({
            student_id: rawStudentId,
            display_name: rawDisplayName || null,
            hall_of_fame_opt_in: hallOfFameOptIn,
        });

        if (insertStudentError) {
            return {
                success: false,
                message: `Failed to initialize student ledger: ${insertStudentError.message}`,
            };
        }
    } else {
        const { error: updateStudentError } = await adminDb
            .from('students')
            .update({
                display_name: rawDisplayName || null,
                hall_of_fame_opt_in: hallOfFameOptIn,
            })
            .eq('student_id', rawStudentId);

        if (updateStudentError) {
            return {
                success: false,
                message: `Failed to update student profile: ${updateStudentError.message}`,
            };
        }
    }

    const { error: bindError } = await adminDb
        .from('app_users')
        .upsert({
            id: user.id,
            email: user.email.toLowerCase(),
            student_id: rawStudentId,
        })
        .eq('id', user.id);

    if (bindError) {
        return { success: false, message: `Failed to link Student ID: ${bindError.message}` };
    }

    revalidatePath('/');
    return { success: true, message: `Student ID ${rawStudentId} linked successfully.` };
}

/**
 * Updates the student's PDPA privacy preferences (Optional Display Name & Hall of Fame Opt-In).
 */
export async function updatePrivacySettingsAction(
    formData: FormData
): Promise<ActionResponse> {
    const supabase = await createSupabaseServerClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, message: 'Authentication required.' };
    }

    const adminDb = createSupabaseAdminClient();
    const { data: appUser } = await adminDb
        .from('app_users')
        .select('student_id')
        .eq('id', user.id)
        .maybeSingle();

    if (!appUser?.student_id) {
        return { success: false, message: 'Please link your AIU Student ID first.' };
    }

    const displayName = String(formData.get('display_name') ?? '').trim();
    const hallOfFameOptIn = formData.get('hall_of_fame_opt_in') === 'on';

    const { error } = await adminDb
        .from('students')
        .update({
            display_name: displayName || null,
            hall_of_fame_opt_in: hallOfFameOptIn,
        })
        .eq('student_id', appUser.student_id);

    if (error) {
        return { success: false, message: error.message };
    }

    revalidatePath('/');
    return { success: true, message: 'Privacy and leaderboard preferences updated.' };
}

/**
 * Signs out the current user session.
 */
export async function signOutAction(): Promise<void> {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
    revalidatePath('/');
}