import { supabaseServer } from '@/lib/supabase-server'

export async function sendExpoToUser(pi_uid: string, event_type: string, title: string, body: string) {
  const { data: rows } = await supabaseServer
    .from('expo_push_tokens')
    .select('token, prefs')
    .eq('pi_uid', pi_uid)

  if (!rows?.length) return

  // 사용자가 해당 알림 종류를 껐으면 제외
  const tokens = rows
    .filter(r => (r.prefs ?? {})[event_type] !== false)
    .map(r => r.token as string)
    .filter(Boolean)

  if (!tokens.length) return

  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(
      tokens.map(token => ({ to: token, sound: 'default', title, body }))
    ),
  }).catch(() => {})
}
