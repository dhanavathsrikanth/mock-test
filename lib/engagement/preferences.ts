const booleanFields=new Set(['push_enabled','email_enabled','system','success','warning','error','info','achievement','reminder','marketing','exam','mock_test','pyq','leaderboard','streak','friend_activity','feature_release','announcement','daily_reminder','streak_alert','daily_question_alert','exam_date_alert','milestone_enabled']);
export function preferenceUpdates(body: unknown): Record<string,boolean|string|null> {
  if (!body || typeof body!=='object' || Array.isArray(body)) throw new Error('Expected preference fields');
  const result: Record<string,boolean|string|null>={};
  for (const [key,value] of Object.entries(body)) {
    if (booleanFields.has(key) && typeof value==='boolean') result[key]=value;
    else if (key==='milestone_channel' && ['in_app','push','email'].includes(String(value))) result[key]=String(value);
    else if (['quiet_hours_start','quiet_hours_end'].includes(key) && (value===null || (typeof value==='string' && /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value)))) result[key]=value;
    else if (key==='reminder_time' && typeof value==='string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value)) result[key]=value;
    else throw new Error('Invalid or unsupported preference field');
  }
  if (!Object.keys(result).length) throw new Error('No preferences supplied');
  return result;
}
