export type CurrencyMode = 'RM' | 'POINTS';
export type UserRole = 'student' | 'volunteer' | 'admin';
export type PayoutActionType = 'cash_claim' | 'merch_claim' | 'admin_override';
export type NotificationCategory = 'submission' | 'milestone' | 'payout' | 'broadcast';

export interface SystemSettings {
    id: number;
    currency_mode: CurrencyMode;
    currency_label: string;
    points_per_rm: number;
    min_qualifying_kg: number;
    level_1_target_drops: number;
    level_1_min_kg: number;
    level_2_target_drops: number;
    level_2_min_kg: number;
    level_2_multiplier: number;
    level_3_target_drops: number;
    level_3_min_kg: number;
    updated_at: string;
}

export interface MaterialCategory {
    id: string;
    name: string;
    base_rate_per_kg: number;
    co2_per_kg: number;
    is_active: boolean;
    sort_order: number;
}

export interface StudentLedger {
    student_id: string;
    display_name: string | null;
    hall_of_fame_opt_in: boolean;
    verified_submissions_count: number;
    last_qualifying_session_date: string | null;

    level_1_unlocked_at: string | null;
    level_1_reward_claimed: boolean;

    level_2_unlocked_at: string | null;
    level_2_reward_claimed: boolean;
    multiplier_expires_at: string | null;

    level_3_unlocked_at: string | null;
    level_3_reward_claimed: boolean;

    total_weight_kg: number;
    total_co2_saved_kg: number;
    reward_balance: number;
    total_reward_earned: number;
    created_at: string;
}

export interface AppUser {
    id: string;
    email: string;
    role: UserRole;
    student_id: string | null;
    created_at: string;
}

export interface Submission {
    id: string;
    student_id: string;
    session_date: string;
    material_id: string;
    weight_kg: number;
    multiplier_applied: number;
    reward_earned: number;
    co2_saved_kg: number;
    logged_by: string | null;
    created_at: string;
}

export interface PayoutLog {
    id: string;
    student_id: string;
    amount_deducted: number;
    action_type: PayoutActionType;
    notes: string | null;
    processed_by: string | null;
    created_at: string;
}

export interface PublicLeaderboardEntry {
    rank: number;
    public_identity: string;
    masked_id: string;
    total_weight_kg: number;
    total_co2_saved_kg: number;
    verified_submissions_count: number;
    is_level_1_pioneer: boolean;
    is_level_2_leader: boolean;
    is_level_3_certified: boolean;
    hall_of_fame_opt_in: boolean;
}

export interface PublicCampusStats {
    total_campus_weight_kg: number;
    total_campus_co2_kg: number;
    active_participants: number;
    tier1_achievers: number;
}

export interface NotificationItem {
    id: string;
    student_id: string | null;
    title: string;
    message: string;
    category: NotificationCategory;
    is_read: boolean;
    created_at: string;
}