import React, { Suspense } from 'react';
import { connection } from 'next/server';
import {
  createSupabaseServerClient,
  createSupabaseAdminClient,
} from '@/lib/supabase/server';
import AuthHeader from '@/components/AuthHeader';
import AuthenticatedWorkspace from '@/components/AuthenticatedWorkspace';
import type {
  AppUser,
  MaterialCategory,
  NotificationItem,
  PublicCampusStats,
  PublicLeaderboardEntry,
  StudentLedger,
  Submission,
  SystemSettings,
} from '@/types/database';

async function DashboardContent() {
  await connection();

  const supabase = await createSupabaseServerClient();
  const adminDb = createSupabaseAdminClient();

  const [
    { data: settingsData },
    { data: materialsData },
    { data: campusStatsData },
    { data: leaderboardData },
    {
      data: { user: authUser },
    },
  ] = await Promise.all([
    adminDb.from('system_settings').select('*').eq('id', 1).single(),
    adminDb
        .from('material_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),
    supabase.from('public_campus_stats').select('*').single(),
    supabase.from('public_leaderboard').select('*').limit(50),
    supabase.auth.getUser(),
  ]);

  const settings: SystemSettings = settingsData ?? {
    id: 1,
    currency_mode: 'POINTS',
    currency_label: 'Pts',
    points_per_rm: 100,
    min_qualifying_kg: 0.10,
    level_1_target_drops: 3,
    level_1_min_kg: 0.60,
    level_2_target_drops: 6,
    level_2_min_kg: 2.00,
    level_2_multiplier: 1.5,
    level_3_target_drops: 12,
    level_3_min_kg: 4.50,
    updated_at: '',
  };

  const materials: MaterialCategory[] = (materialsData ?? []) as MaterialCategory[];
  const campusStats: PublicCampusStats = campusStatsData ?? {
    total_campus_weight_kg: 0,
    total_campus_co2_kg: 0,
    active_participants: 0,
    tier1_achievers: 0,
  };
  const leaderboard: PublicLeaderboardEntry[] = (leaderboardData ??
      []) as PublicLeaderboardEntry[];

  let currentUser: AppUser | null = null;
  let studentLedger: StudentLedger | null = null;
  let studentSubmissions: Submission[] = [];
  let allStudentsForStaff: StudentLedger[] = [];
  let allSubmissionsForAdmin: Submission[] = [];
  let notifications: NotificationItem[] = [];

  if (authUser && authUser.email) {
    const { data: existingAppUser } = await adminDb
        .from('app_users')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

    if (existingAppUser) {
      currentUser = existingAppUser as AppUser;
    } else {
      const { data: createdAppUser } = await adminDb
          .from('app_users')
          .upsert({
            id: authUser.id,
            email: authUser.email.toLowerCase(),
            role: 'student',
          })
          .select('*')
          .single();
      currentUser = (createdAppUser as AppUser) ?? null;
    }

    if (currentUser?.student_id) {
      const [{ data: ledgerRow }, { data: subRows }, { data: notifRows }] =
          await Promise.all([
            adminDb
                .from('students')
                .select('*')
                .eq('student_id', currentUser.student_id)
                .maybeSingle(),
            adminDb
                .from('submissions')
                .select('*')
                .eq('student_id', currentUser.student_id)
                .order('created_at', { ascending: false })
                .limit(30),
            adminDb
                .from('notifications')
                .select('*')
                .or(`student_id.is.null,student_id.eq.${currentUser.student_id}`)
                .order('created_at', { ascending: false })
                .limit(20),
          ]);

      studentLedger = (ledgerRow as StudentLedger) ?? null;
      studentSubmissions = (subRows ?? []) as Submission[];
      notifications = (notifRows ?? []) as NotificationItem[];
    } else {
      const { data: broadcastRows } = await adminDb
          .from('notifications')
          .select('*')
          .is('student_id', null)
          .order('created_at', { ascending: false })
          .limit(10);
      notifications = (broadcastRows ?? []) as NotificationItem[];
    }

    if (currentUser?.role === 'volunteer' || currentUser?.role === 'admin') {
      const { data: allStudentRows } = await adminDb
          .from('students')
          .select('*')
          .order('student_id', { ascending: true });
      allStudentsForStaff = (allStudentRows ?? []) as StudentLedger[];
    }

    if (currentUser?.role === 'admin') {
      const { data: allSubRows } = await adminDb
          .from('submissions')
          .select('*')
          .order('created_at', { ascending: false });
      allSubmissionsForAdmin = (allSubRows ?? []) as Submission[];
    }
  } else {
    const { data: publicBroadcasts } = await adminDb
        .from('notifications')
        .select('*')
        .is('student_id', null)
        .order('created_at', { ascending: false })
        .limit(10);
    notifications = (publicBroadcasts ?? []) as NotificationItem[];
  }

  return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <AuthHeader currentUser={currentUser} notifications={notifications} />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <AuthenticatedWorkspace
              currentUser={currentUser}
              studentLedger={studentLedger}
              studentSubmissions={studentSubmissions}
              settings={settings}
              materials={materials}
              campusStats={campusStats}
              leaderboard={leaderboard}
              allStudentsForStaff={allStudentsForStaff}
              allSubmissionsForAdmin={allSubmissionsForAdmin}
          />
        </main>
      </div>
  );
}

export default function HomePage() {
  return (
      <Suspense
          fallback={
            <div className="min-h-screen bg-slate-50 flex items-center justify-center text-xs font-mono text-slate-500">
              Loading SP Corner...
            </div>
          }
      >
        <DashboardContent />
      </Suspense>
  );
}