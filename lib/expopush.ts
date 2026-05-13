import { supabaseServer } from '@/lib/supabase-server'

export async function sendExpoToUser(pi_uid: string, title: string, body: string) {
  const { data: rows } = await supabaseServer
    .from('expo_push_tokens')
    .select('token')
    .eq('pi_uid', pi_uid)

  const tokens = (rows ?? []).map((r: any) => r.token as string).filter(Boolean)
  if (!tokens.length) return

  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(
      tokens.map(token => ({ to: token, sound: 'default', title, body }))
    ),
  }).catch(() => {})
}
