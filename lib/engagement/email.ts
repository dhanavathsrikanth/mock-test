const escape = (text: string) => text.replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));

export function milestoneEmail(title: string, message: string, action: string, unsubscribe: string, sender: string, address: string) {
  return {
    subject:title,
    text:`${title}\n\n${message}\n\nStart a sprint: ${action}\n\nUnsubscribe from streak milestone messages: ${unsubscribe}\n\n${sender}\n${address}`,
    html:`<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)}</title></head><body style="margin:0;padding:24px;background:#f5f6f5;color:#17251b;font-family:Arial,sans-serif"><main style="max-width:520px;margin:auto;padding:28px;background:white;border-radius:12px"><p style="font-size:13px;color:#526458">STUDY MILESTONE</p><h1 style="font-size:26px;line-height:1.3">${escape(title)}</h1><p style="font-size:16px;line-height:1.6">${escape(message)}</p><p style="margin:28px 0"><a href="${escape(action)}" style="display:inline-block;padding:15px 24px;border-radius:8px;background:#24643d;color:white;text-decoration:none;font-size:16px">Start a 5-Q sprint</a></p><hr style="border:0;border-top:1px solid #ddd"><p style="font-size:13px;line-height:1.6;color:#526458">You opted in to streak milestone messages. <a href="${escape(unsubscribe)}">Unsubscribe</a> anytime.</p><p style="font-size:12px;color:#526458">${escape(sender)}<br>${escape(address)}</p></main></body></html>`,
  };
}
