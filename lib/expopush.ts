import { supabaseServer } from '@/lib/supabase-server'

export async function sendExpoToUser(pi_uid: string, event_type: string, title: string, body: string) {
  const { data: rows } = await supabaseServer
    .from('expo_push_tokens')
    .select('token, prefs')
    .eq('pi_uid', pi_uid)

  if (!rows?.length) return

  const messages = rows
    .filter(r => (r.prefs ?? {})[event_type] !== false)
    .map(r => {
      const soundNum = (r.prefs ?? {}).sound ?? '1'
      return {
        to: r.token as string,
        title,
        body,
        channelId: `sound-${soundNum}`,
        sound: 'default',
      }
    })
    .filter(m => m.to)

  if (!messages.length) return

  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(messages),
  }).catch((e) => { console.error('[expopush] fetch error:', e); return null })

  if (res) {
    const json = await res.json().catch(() => null)
    if (!res.ok || json?.errors?.length) {
      console.error('[expopush] Expo push failed:', JSON.stringify(json))
    } else {
      console.log('[expopush] sent to', messages.length, 'token(s), data:', JSON.stringify(json?.data))
    }
  }
}
