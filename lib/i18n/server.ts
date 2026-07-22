// Server-side i18n for notifications (Telegram, Push, etc.)
// Does NOT import JSON files — uses inline templates for lightweight server usage.

export type ServerLocale = 'ko' | 'en' | 'zh-TW' | 'vi'

const templates: Record<string, Record<ServerLocale, string>> = {
  // node-watchdog: offline
  'node.offline.title': {
    ko: '노드 가디언 응답 없음',
    en: 'Node Guardian not responding',
    'zh-TW': 'Node Guardian 無回應',
    vi: 'Node Guardian không phản hồi',
  },
  'node.offline.body': {
    ko: 'PC가 꺼졌거나 앱이 종료된 것 같습니다. (마지막 신호: {lastSeen})',
    en: 'Your PC may be off or the app has stopped. (Last signal: {lastSeen})',
    'zh-TW': '電腦可能已關機或應用程式已停止。（最後信號：{lastSeen}）',
    vi: 'PC có thể đã tắt hoặc ứng dụng đã dừng. (Tín hiệu cuối: {lastSeen})',
  },
  'node.offline.telegram': {
    ko: '🔴 <b>노드 가디언 응답 없음</b>\n\nPC가 꺼졌거나 앱이 종료된 것 같습니다.\n⏱ 마지막 신호: {lastSeen}\n\n당신의 노드가 멈춰있어요. 얼른 토끼굴로 복귀하세요!\n👉 <a href="https://linkpi.io">linkpi.io</a>',
    en: '🔴 <b>Node Guardian not responding</b>\n\nYour PC may be off or the app has stopped.\n⏱ Last signal: {lastSeen}\n\nYour node is down. Please check it!\n👉 <a href="https://linkpi.io">linkpi.io</a>',
    'zh-TW': '🔴 <b>Node Guardian 無回應</b>\n\n電腦可能已關機或應用程式已停止。\n⏱ 最後信號：{lastSeen}\n\n您的節點已停止，請儘快確認！\n👉 <a href="https://linkpi.io">linkpi.io</a>',
    vi: '🔴 <b>Node Guardian không phản hồi</b>\n\nPC có thể đã tắt hoặc ứng dụng đã dừng.\n⏱ Tín hiệu cuối: {lastSeen}\n\nNode của bạn đã dừng. Vui lòng kiểm tra!\n👉 <a href="https://linkpi.io">linkpi.io</a>',
  },
  'node.offline.repeat.telegram': {
    ko: '🔴 <b>[재알림] 노드 가디언 응답 없음</b>\n\n마지막 신호: {lastSeen}\n⚠️ 아직 복구되지 않았습니다.\n\n당신의 노드가 멈춰있어요. 얼른 토끼굴로 복귀하세요!\n👉 <a href="https://linkpi.io">linkpi.io</a>',
    en: '🔴 <b>[Reminder] Node Guardian not responding</b>\n\nLast signal: {lastSeen}\n⚠️ Still not recovered.\n\nYour node is still down. Please check it!\n👉 <a href="https://linkpi.io">linkpi.io</a>',
    'zh-TW': '🔴 <b>[再次提醒] Node Guardian 無回應</b>\n\n最後信號：{lastSeen}\n⚠️ 仍未恢復。\n\n您的節點仍然停止中，請儘快確認！\n👉 <a href="https://linkpi.io">linkpi.io</a>',
    vi: '🔴 <b>[Nhắc lại] Node Guardian không phản hồi</b>\n\nTín hiệu cuối: {lastSeen}\n⚠️ Vẫn chưa phục hồi.\n\nNode của bạn vẫn đang dừng. Vui lòng kiểm tra!\n👉 <a href="https://linkpi.io">linkpi.io</a>',
  },
  'node.offline.repeat.body': {
    ko: '마지막 신호: {lastSeen} — 아직 복구되지 않았습니다.',
    en: 'Last signal: {lastSeen} — still not recovered.',
    'zh-TW': '最後信號：{lastSeen} — 仍未恢復。',
    vi: 'Tín hiệu cuối: {lastSeen} — vẫn chưa phục hồi.',
  },
  'node.offline.event': {
    ko: '노드 가디언 응답 없음 — PC가 꺼졌거나 앱이 종료된 것 같습니다. (마지막 신호: {lastSeen})',
    en: 'Node Guardian not responding — PC may be off or app stopped. (Last signal: {lastSeen})',
    'zh-TW': 'Node Guardian 無回應 — 電腦可能已關機或應用程式已停止。（最後信號：{lastSeen}）',
    vi: 'Node Guardian không phản hồi — PC có thể đã tắt hoặc ứng dụng đã dừng. (Tín hiệu cuối: {lastSeen})',
  },
  'node.offline.repeat.event': {
    ko: '노드 가디언 응답 없음 — {lastSeen}째 미복구 중',
    en: 'Node Guardian not responding — down since {lastSeen}',
    'zh-TW': 'Node Guardian 無回應 — 已停機 {lastSeen}',
    vi: 'Node Guardian không phản hồi — ngừng từ {lastSeen}',
  },

  // node-watchdog: online (recovery)
  'node.online.title': {
    ko: '노드 가디언 재접속',
    en: 'Node Guardian reconnected',
    'zh-TW': 'Node Guardian 已重新連線',
    vi: 'Node Guardian đã kết nối lại',
  },
  'node.online.body': {
    ko: '노드 가디언 재접속 — 정상 모니터링이 재개됐습니다.',
    en: 'Node Guardian reconnected — monitoring has resumed.',
    'zh-TW': 'Node Guardian 已重新連線 — 已恢復正常監控。',
    vi: 'Node Guardian đã kết nối lại — đã tiếp tục giám sát.',
  },
  'node.online.telegram': {
    ko: '✅ <b>노드 가디언 재접속</b>\n\n정상 모니터링이 재개됐습니다.\n\n다음 중단은 막을 수 있습니다.\n운영자들의 노하우가 커뮤니티에 쌓이고 있어요.\n👉 <a href="https://linkpi.io">linkpi.io</a>',
    en: '✅ <b>Node Guardian reconnected</b>\n\nMonitoring has resumed.\n\nJoin the community to learn from other node operators.\n👉 <a href="https://linkpi.io">linkpi.io</a>',
    'zh-TW': '✅ <b>Node Guardian 已重新連線</b>\n\n已恢復正常監控。\n\n加入社群，與其他節點運營者交流經驗。\n👉 <a href="https://linkpi.io">linkpi.io</a>',
    vi: '✅ <b>Node Guardian đã kết nối lại</b>\n\nĐã tiếp tục giám sát bình thường.\n\nTham gia cộng đồng để học hỏi kinh nghiệm.\n👉 <a href="https://linkpi.io">linkpi.io</a>',
  },
  'node.online.event': {
    ko: '노드 가디언 재접속 — 정상 모니터링이 재개됐습니다.',
    en: 'Node Guardian reconnected — monitoring has resumed.',
    'zh-TW': 'Node Guardian 已重新連線 — 已恢復正常監控。',
    vi: 'Node Guardian đã kết nối lại — đã tiếp tục giám sát.',
  },

  // Expo push titles
  'push.offline.title': {
    ko: '🔴 [@{nickname}] 응답 없음',
    en: '🔴 [@{nickname}] Not responding',
    'zh-TW': '🔴 [@{nickname}] 無回應',
    vi: '🔴 [@{nickname}] Không phản hồi',
  },
  'push.offline.repeat.title': {
    ko: '🔴 [@{nickname}] 재알림',
    en: '🔴 [@{nickname}] Reminder',
    'zh-TW': '🔴 [@{nickname}] 再次提醒',
    vi: '🔴 [@{nickname}] Nhắc lại',
  },
  'push.online.title': {
    ko: '✅ [@{nickname}] 재접속',
    en: '✅ [@{nickname}] Reconnected',
    'zh-TW': '✅ [@{nickname}] 已重新連線',
    vi: '✅ [@{nickname}] Đã kết nối lại',
  },
}

export function st(key: string, locale: ServerLocale = 'ko', params?: Record<string, string | number>): string {
  const template = templates[key]
  if (!template) return key
  let text = template[locale] ?? template.ko
  if (params) {
    text = text.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`))
  }
  return text
}

export function getUserLocale(locale: string | null | undefined): ServerLocale {
  if (locale && locale in { ko: 1, en: 1, 'zh-TW': 1, vi: 1 }) return locale as ServerLocale
  return 'ko'
}
