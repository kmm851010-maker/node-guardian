const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? ''
const API = `https://api.telegram.org/bot${BOT_TOKEN}`

export async function sendTelegramMessage(chat_id: number | string, text: string) {
  if (!BOT_TOKEN) return
  await fetch(`${API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id, text, parse_mode: 'HTML' }),
  }).catch(() => {})
}
