import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const pi_uid = formData.get('pi_uid') as string
  const nickname = formData.get('nickname') as string | null
  const file = formData.get('file') as File | null

  if (!pi_uid || !file) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  if (file.size > 2 * 1024 * 1024) return NextResponse.json({ error: 'File too large (max 2MB)' }, { status: 400 })

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const allowed = ['jpg', 'jpeg', 'png', 'gif', 'webp']
  if (!allowed.includes(ext)) return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 })

  const path = `${pi_uid}.${ext}`
  const arrayBuffer = await file.arrayBuffer()

  const { error: uploadError } = await supabaseServer.storage
    .from('avatars')
    .upload(path, arrayBuffer, { contentType: file.type, upsert: true })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: { publicUrl } } = supabaseServer.storage.from('avatars').getPublicUrl(path)
  const avatarUrl = `${publicUrl}?t=${Date.now()}`

  const orFilter = nickname
    ? `pi_uid.eq.${pi_uid},nickname.eq.${nickname}`
    : `pi_uid.eq.${pi_uid}`
  const { data: rows } = await supabaseServer
    .from('node_profiles')
    .select('pi_uid')
    .or(orFilter)
    .limit(1)

  if (rows && rows.length > 0) {
    const { error } = await supabaseServer
      .from('node_profiles')
      .update({ avatar_url: avatarUrl })
      .eq('pi_uid', rows[0].pi_uid)
    if (error) {
      console.error('[avatar update]', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  } else {
    const { error: insertError } = await supabaseServer
      .from('node_profiles')
      .insert({ pi_uid, nickname: nickname ?? pi_uid, avatar_url: avatarUrl })
    if (insertError) {
      if (insertError.code === '23505' && nickname) {
        await supabaseServer.from('node_profiles')
          .update({ avatar_url: avatarUrl, pi_uid })
          .eq('nickname', nickname)
      } else {
        console.error('[avatar insert]', insertError.message)
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }
    }
  }

  return NextResponse.json({ ok: true, avatar_url: avatarUrl })
}
