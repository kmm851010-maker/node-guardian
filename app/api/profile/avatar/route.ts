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

  const { data: updated, error: updateError } = await supabaseServer
    .from('node_profiles')
    .update({ avatar_url: publicUrl })
    .eq('pi_uid', pi_uid)
    .select('avatar_url')
    .maybeSingle()

  if (updateError) {
    console.error('[avatar update by pi_uid]', updateError.message)
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  if (!updated && nickname) {
    const { data: updated2, error: updateError2 } = await supabaseServer
      .from('node_profiles')
      .update({ avatar_url: publicUrl })
      .eq('nickname', nickname)
      .select('avatar_url')
      .maybeSingle()

    if (updateError2) {
      console.error('[avatar update by nickname]', updateError2.message)
      return NextResponse.json({ error: updateError2.message }, { status: 500 })
    }

    if (!updated2) {
      const { error: insertError } = await supabaseServer
        .from('node_profiles')
        .insert({ pi_uid, nickname: nickname ?? pi_uid, avatar_url: publicUrl })
      if (insertError) {
        console.error('[avatar insert]', insertError.message)
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }
    }
  }

  return NextResponse.json({ ok: true, avatar_url: publicUrl })
}
