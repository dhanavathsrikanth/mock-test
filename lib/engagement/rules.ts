export const CONSENT_VERSION = 'streak-milestones-v1';
export type CampaignChannel = 'in_app' | 'push' | 'email';
export type CampaignJob = {
  id: string; user_id: string; campaign_id: string; milestone: 5 | 7; exam_id: string; stream_id: string | null;
  channel: CampaignChannel; attempts: number; lease_token: string; expires_at: string;
  send_started_at: string | null;
};
export type MilestonePreferences = {
  milestone_enabled?: boolean; milestone_channel?: CampaignChannel; milestone_consent_at?: string | null;
  milestone_consent_version?: string | null; streak?: boolean; push_enabled?: boolean; email_enabled?: boolean;
  quiet_hours_start?: string | null; quiet_hours_end?: string | null;
};
export function quietUntil(now: Date, start = '21:00', end = '08:00'): Date | null {
  const minutes = (value: string) => Number(value.slice(0,2))*60 + Number(value.slice(3,5));
  const low=minutes(start), high=minutes(end);
  if (low===high) return null;
  const local=new Date(now.getTime()+330*60000);
  const current=local.getUTCHours()*60+local.getUTCMinutes();
  const quiet=low<high ? current>=low && current<high : current>=low || current<high;
  if (!quiet) return null;
  const tomorrow=low>high && current>=low ? 1 : 0;
  return new Date(Date.UTC(local.getUTCFullYear(),local.getUTCMonth(),local.getUTCDate()+tomorrow,Math.floor(high/60),high%60)-330*60000);
}
export function eligibility(job: CampaignJob, profile: { target_exam_id: string | null; target_stream_id: string | null; banned?: boolean },
  prefs: MilestonePreferences | null, campaign: { enabled: boolean; exam_id: string; stream_id: string | null } | null,
  streak: { current_streak: number; last_activity_date: string | null } | null, now = new Date()): string | null {
  if (new Date(job.expires_at)<=now) return 'Milestone expired';
  if (profile.banned || profile.target_exam_id!==job.exam_id || profile.target_stream_id!==job.stream_id) return 'Student scope changed or account unavailable';
  if (!campaign?.enabled || campaign.exam_id!==job.exam_id || (campaign.stream_id!==null && campaign.stream_id!==job.stream_id)) return 'Campaign disabled or scope changed';
  if (!prefs?.milestone_enabled || !prefs.milestone_consent_at || prefs.milestone_consent_version!==CONSENT_VERSION || !prefs.streak || prefs.milestone_channel!==job.channel) return 'Milestone consent or preference changed';
  if ((job.channel==='push' && !prefs.push_enabled) || (job.channel==='email' && !prefs.email_enabled)) return 'Channel disabled';
  if (!streak || streak.current_streak<job.milestone) return 'Streak reset before delivery';
  const yesterday=new Date(now.getTime()+330*60000-86400000).toISOString().slice(0,10);
  if (!streak.last_activity_date || streak.last_activity_date<yesterday) return 'Streak is no longer active';
  return null;
}
export function milestoneCopy(milestone: 5 | 7) {
  return milestone===5
    ? { title:'Five days strong!', message:'You reached a 5-day study streak. Keep the momentum with a focused five-question sprint.', path:'/practice' }
    : { title:'A week of steady practice!', message:'You reached a 7-day study streak. Celebrate your progress with another small win.', path:'/practice' };
}
export function retryAt(attempts: number, now = new Date()) {
  return new Date(now.getTime()+[60000,300000,1800000,7200000][Math.min(Math.max(attempts-1,0),3)]);
}
