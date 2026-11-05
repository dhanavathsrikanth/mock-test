import { ImageResponse } from 'next/og';
import { getChallenge } from '@/lib/challenge-server';
import { formatMarks } from '@/lib/marking';
export const size = { width:1200, height:630 };
export const contentType = 'image/png';
export default async function Image({ params }: { params: Promise<{ challengeId: string }> }) {
  const c = await getChallenge((await params).challengeId);
  return new ImageResponse(<div style={{width:'100%',height:'100%',display:'flex',flexDirection:'column',justifyContent:'space-between',background:'#edf2ff',color:'#162248',padding:70,fontFamily:'sans-serif'}}>
    <div style={{display:'flex',fontSize:25,fontWeight:700,letterSpacing:4}}>CLASSMATE CHALLENGE / 5 QUESTIONS</div>
    <div style={{display:'flex',fontSize:58,fontWeight:800}}>{c ? `${c.creatorName} set the score. Can you beat it?` : 'Take the sprint challenge'}</div>
    <div style={{display:'flex',alignItems:'baseline',gap:25}}><span style={{fontSize:110,fontWeight:800}}>{c ? formatMarks(c.creatorScore) : '5'}</span><span style={{fontSize:42}}>{c ? `/ ${formatMarks(c.maximum)} marks` : 'questions'}</span></div>
    <div style={{display:'flex',justifyContent:'space-between',fontSize:26}}><span>{c?.label ?? 'Practice sprint'}</span><span>{c?.minutes ?? 12} min · Start as a guest →</span></div>
  </div>, size);
}
