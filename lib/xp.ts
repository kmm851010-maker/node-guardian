import { supabaseServer } from '@/lib/supabase-server'

// Lv.1-10: 50 XP/level | 10-20: 70 | 20-30: 100 | 30-40: 150 | 40-100: 200
export function getLevel(xp: number): number {
  if (xp >= 15650) return 100
  if (xp >= 3650)  return 40 + Math.floor((xp - 3650) / 200)
  if (xp >= 2150)  return 30 + Math.floor((xp - 2150) / 150)
  if (xp >= 1150)  return 20 + Math.floor((xp - 1150) / 100)
  if (xp >= 450)   return 10 + Math.floor((xp - 450)  / 70)
  return Math.floor(xp / 50) + 1
}

export function getNextLevelThreshold(level: number): number | null {
  if (level >= 100) return null
  if (level < 10)  return level * 50
  if (level < 20)  return 450  + (level - 10) * 70
  if (level < 30)  return 1150 + (level - 20) * 100
  if (level < 40)  return 2150 + (level - 30) * 150
  return 3650 + (level - 40) * 200
}

function getTodayKST(): string {
  const now = new Date(Date.now() + 9 * 3600000)
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`
}

export async function addXp(pi_uid: string, amount: number) {
  if (!pi_uid || amount <= 0) return
  const today = getTodayKST()
  const { data: existing } = await supabaseServer
    .from('attendance')
    .select('xp_earned')
    .eq('pi_uid', pi_uid)
    .eq('checked_date', today)
    .maybeSingle()

  if (existing) {
    await supabaseServer
      .from('attendance')
      .update({ xp_earned: existing.xp_earned + amount })
      .eq('pi_uid', pi_uid)
      .eq('checked_date', today)
  } else {
    await supabaseServer
      .from('attendance')
      .insert({ pi_uid, checked_date: today, xp_earned: amount })
  }
}
