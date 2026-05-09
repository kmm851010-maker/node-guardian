import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const author_uid = formData.get('author_uid') as string | null
  const file = formData.get('file') as File | null

  if (!author_uid || !file) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 })

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const allowed = ['jpg', 'jpeg', 'png', 'gif', 'webp']
  if (!allowed.includes(ext)) return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 })

  const path = `${author_uid}/${Date.now()}.${ext}`
  const arrayBuffer = await file.arrayBuffer()

  const { error: uploadError } = await supabaseServer.storage
    .from('post-images')
    .upload(path, arrayBuffer, { contentType: file.type, upsert: true })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: { publicUrl } } = supabaseServer.storage.from('post-images').getPublicUrl(path)
  return NextResponse.json({ url: publicUrl })
}
