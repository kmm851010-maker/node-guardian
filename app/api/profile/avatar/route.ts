import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const pi_uid = formData.get('pi_uid') as string
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

  const { error: updateError } = await supabaseServer
    .from('node_profiles')
    .update({ avatar_url: publicUrl })
    .eq('pi_uid', pi_uid)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  return NextResponse.json({ ok: true, avatar_url: publicUrl })
}
