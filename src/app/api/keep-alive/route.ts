import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

export async function GET() {
    const adminDb = createSupabaseAdminClient();
    const { data, error } = await adminDb
        .from('system_settings')
        .select('id, currency_mode')
        .eq('id', 1)
        .single();

    if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
        ok: true,
        service: 'sp-corner-aiu-keep-alive',
        mode: data.currency_mode,
        timestamp: new Date().toISOString(),
    });
}