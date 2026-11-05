import { NextResponse } from 'next/server';
import { createCronClient } from '@/lib/supabase/cron';
import { authorizedCron } from '@/lib/engagement/security';
import { processCampaignJob } from '@/lib/engagement/worker';
import type { CampaignJob } from '@/lib/engagement/rules';

export const maxDuration=60;
export async function GET(request: Request) {
  if (!authorizedCron(request)) return NextResponse.json({error:'Unauthorized'},{status:401});
  if (process.env.STREAK_CAMPAIGNS_ENABLED!=='true') return NextResponse.json({enabled:false,processed:0});
  try {
    const db=createCronClient();
    const counts: Record<string,number>={}; const started=Date.now();
    for (let i=0;i<100 && Date.now()-started<40000;i++) {
      const {data,error}=await db.rpc('claim_streak_campaign_jobs',{p_limit:1});
      if (error) throw error;
      const job=(data as CampaignJob[] | null)?.[0];
      if (!job) break;
      const status=await processCampaignJob(db,job);
      counts[status]=(counts[status] ?? 0)+1;
    }
    return NextResponse.json({enabled:true,counts});
  } catch (error) {
    console.error('Streak campaign worker failed',error instanceof Error ? error.message : 'Database or configuration error');
    return NextResponse.json({error:'Campaign processing failed; leased jobs will be retried'},{status:503});
  }
}
