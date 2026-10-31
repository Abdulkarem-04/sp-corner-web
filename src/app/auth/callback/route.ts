import { NextResponse } from 'next/server';
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    const next = searchParams.get('next') ?? '/';

    if (code) {
        const supabase = await createSupabaseServerClient();
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error && data.user) {
            const email = (data.user.email ?? '').toLowerCase();

            // Ensure a row exists in public.app_users even if the DB trigger had any delay
            const adminSupabase = createSupabaseAdminClient();
            await adminSupabase
                .from('app_users')
                .upsert(
                    {
                        id: data.user.id,
                        email,
                    },
                    { onConflict: 'id', ignoreDuplicates: true }
                );

            return NextResponse.redirect(`${origin}${next}`);
        }
    }

    return NextResponse.redirect(`${origin}/?authError=verification_failed`);
}