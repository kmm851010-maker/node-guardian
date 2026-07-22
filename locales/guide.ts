interface Step {
  title: string
  desc: string
  note?: string
  warn?: string
  code?: string
}

interface GuideTexts {
  header: string
  headerSub: string
  tabPc: string
  tabPi: string
  tabPiDesc: string
  tabPcDesc: string
  download: string
  downloadNote: string
  footer: string
  firstVisit: string
  firstVisitSub: string
  viewGuide: string
  later: string
  guide: string
  piSteps: Step[]
  pcSteps: Step[]
}

const ko: GuideTexts = {
  header: 'LinkPi 시작 가이드',
  headerSub: '① PC 프로그램 설치 → ② Pi Browser 연동 순서로 진행하세요',
  tabPc: '1단계 · PC 프로그램 설치',
  tabPi: '2단계 · Pi Browser 연동',
  tabPiDesc: '2단계 · PC 프로그램 설치 완료 후 진행하세요 · Pi Browser에서 pilink.vercel.app 접속',
  tabPcDesc: '1단계 먼저! · PC에 프로그램을 먼저 설치해야 Pi Browser와 연동됩니다',
  download: 'NodeGuardian.exe 다운로드',
  downloadNote: 'Windows 10/11 · 설치 프로그램 없음 · 무료',
  footer: '설치 중 문제가 생겼나요? QnA 게시판에 질문해주세요!',
  firstVisit: '처음 방문하셨나요?',
  firstVisitSub: 'LinkPi 시작 가이드를 확인해보세요!',
  viewGuide: '가이드 보기',
  later: '나중에',
  guide: '사용법',
  piSteps: [
    { title: 'Pi 앱을 실행하고 브라우저 탭 열기', desc: '스마트폰에서 Pi Network 앱을 실행합니다. 하단 메뉴에서 지구본 모양의 "Browser" 탭을 누르세요.', note: 'Pi Browser는 Pi 앱 안에 내장되어 있어 별도 설치가 필요 없습니다.' },
    { title: '주소창에 사이트 주소 입력', desc: 'Pi Browser 상단 주소창을 누르고 아래 주소를 입력한 뒤 이동하세요.', code: 'pilink.vercel.app' },
    { title: '오른쪽 상단 "Pi 로그인" 버튼 클릭', desc: '사이트에 접속하면 우측 상단에 보라색 "Pi 로그인" 버튼이 보입니다. 버튼을 눌러주세요.', note: '"Pi 로그인" 버튼은 Pi Browser에서만 보입니다. 일반 브라우저에서는 표시되지 않아요.' },
    { title: 'Pi 계정 인증', desc: 'Pi 앱에서 인증 팝업이 뜨면 "Allow" 또는 "허용" 버튼을 누르세요. 자동으로 로그인됩니다.', warn: '팝업이 뜨지 않으면 Pi 앱을 재시작한 뒤 다시 시도해주세요.' },
    { title: '대시보드에서 내 노드 상태 확인', desc: '로그인 후 대시보드에서 내 Pi 노드 상태, 포트 현황, 이벤트 로그를 실시간으로 확인할 수 있습니다.', note: 'Node Guardian PC 프로그램이 실행 중이어야 노드 상태가 표시됩니다.' },
    { title: '텔레그램 알림 설정 (권장)', desc: 'Pi Browser에서는 웹 푸시 알림이 지원되지 않아 텔레그램 알림을 권장합니다.', code: '① 텔레그램에서 @serge_node_guardian_bot 검색\n② 채팅창에서 /start 입력\n③ 봇이 답장한 숫자(Chat ID)를 복사\n④ 프로필 탭 → 텔레그램 알림 → ID 입력 후 연결', note: '연결 성공 시 텔레그램으로 확인 메시지가 옵니다.' },
  ],
  pcSteps: [
    { title: 'PC 일반 브라우저에서 사이트 접속', desc: '크롬, 엣지 등 일반 브라우저에서 아래 주소로 접속하세요.', code: 'pilink.vercel.app', note: '스마트폰 Pi Browser에서는 다운로드 버튼이 표시되지 않아요. 반드시 PC에서 접속하세요.' },
    { title: '상단 "프로그램 다운로드" 버튼 클릭', desc: 'PC 화면 오른쪽 상단의 보라색 "프로그램 다운로드" 버튼을 눌러 NodeGuardian.exe 파일을 받으세요.', warn: '브라우저가 다운로드를 차단하면 "유지" 또는 "Keep" 버튼을 눌러 계속 진행하세요.' },
    { title: 'Windows 보안 경고 처리', desc: '처음 실행 시 Windows SmartScreen 경고창이 뜰 수 있습니다. 이는 새 프로그램이라 생기는 정상적인 경고입니다.', code: '① "추가 정보" 또는 "More info" 클릭\n② "실행" 또는 "Run anyway" 클릭', note: '이 프로그램은 오픈소스이며 소스코드를 GitHub에서 누구나 확인할 수 있습니다.' },
    { title: '설정 마법사 — Pi 정보 입력', desc: '프로그램을 실행하면 설정 창이 자동으로 뜹니다.', code: '• Pi 사용자명: Pi 앱에서 사용하는 닉네임\n  (예: piuser123)\n• 입력 후 "저장하고 시작하기" 클릭', note: '사용자명을 모르면 Pi 앱 → 프로필에서 @ 뒤에 오는 이름입니다.' },
    { title: '모니터링 시작 확인', desc: '설정 완료 후 프로그램이 자동으로 노드 감시를 시작합니다.', code: '🟢 초록 — 노드 정상 작동 중\n🟡 노랑 — 경고\n🔴 빨강 — 위험\n⚪ 회색 — 시작 중', note: 'RAM 약 25~40MB, CPU 0~0.1% 수준으로 매우 가볍습니다.' },
    { title: 'Pi Browser에서 상태 확인', desc: '스마트폰 Pi Browser에서 pilink.vercel.app 에 접속하면 노드 상태가 실시간으로 표시됩니다.', note: 'PC의 노드 고유번호를 프로필에 등록해야 연동됩니다.' },
    { title: '재부팅 후 자동 시작 등록 (강력 권장)', desc: 'PC가 재부팅되면 자동으로 실행되도록 등록하세요.', code: '① NodeGuardian.exe 우클릭 → "바로 가기 만들기"\n② Win+R → shell:startup 입력\n③ 열린 폴더에 바로가기 붙여넣기\n\n✅ 이제 PC 재시작 시 자동 실행됩니다.', note: '확인: 작업 관리자 → 시작 프로그램 탭 → NodeGuardian "사용" 표시' },
  ],
}

const en: GuideTexts = {
  header: 'LinkPi Getting Started',
  headerSub: '① Install PC program → ② Connect Pi Browser',
  tabPc: 'Step 1 · Install PC Program',
  tabPi: 'Step 2 · Connect Pi Browser',
  tabPiDesc: 'Step 2 · Complete PC installation first · Open pilink.vercel.app in Pi Browser',
  tabPcDesc: 'Step 1 first! · Install the PC program before connecting Pi Browser',
  download: 'Download NodeGuardian.exe',
  downloadNote: 'Windows 10/11 · No installer · Free',
  footer: 'Having trouble? Ask in the Q&A board!',
  firstVisit: 'First time here?',
  firstVisitSub: 'Check out the LinkPi getting started guide!',
  viewGuide: 'View Guide',
  later: 'Later',
  guide: 'Guide',
  piSteps: [
    { title: 'Open Pi App and go to Browser tab', desc: 'Open the Pi Network app on your phone. Tap the globe-shaped "Browser" tab at the bottom.', note: 'Pi Browser is built into the Pi app — no separate install needed.' },
    { title: 'Enter the site address', desc: 'Tap the address bar in Pi Browser and enter the address below.', code: 'pilink.vercel.app' },
    { title: 'Tap "Sign in with Pi" button', desc: 'You\'ll see a purple "Sign in with Pi" button at the top right. Tap it.', note: 'This button only appears in Pi Browser, not in regular browsers.' },
    { title: 'Authenticate with Pi', desc: 'When the Pi authentication popup appears, tap "Allow". You\'ll be signed in automatically.', warn: 'If the popup doesn\'t appear, restart the Pi app and try again.' },
    { title: 'Check your node status', desc: 'After signing in, view your Pi Node status, port info, and event logs in real time on the dashboard.', note: 'Node Guardian PC program must be running to display node status.' },
    { title: 'Set up Telegram alerts (recommended)', desc: 'Pi Browser doesn\'t support web push notifications. We recommend Telegram alerts instead.', code: '① Search @serge_node_guardian_bot on Telegram\n② Send /start in the chat\n③ Copy the Chat ID number\n④ Profile tab → Telegram alerts → Enter ID and connect', note: 'You\'ll receive a confirmation message on Telegram when connected.' },
  ],
  pcSteps: [
    { title: 'Visit the site from a PC browser', desc: 'Open Chrome, Edge, or any browser on your PC and go to the address below.', code: 'pilink.vercel.app', note: 'The download button only appears on PC, not on mobile Pi Browser.' },
    { title: 'Click "Download App" button', desc: 'Click the purple "Download App" button at the top right to download NodeGuardian.exe.', warn: 'If your browser blocks the download, click "Keep" to continue.' },
    { title: 'Handle Windows security warning', desc: 'Windows SmartScreen may show a warning on first run. This is normal for new programs.', code: '① Click "More info"\n② Click "Run anyway"', note: 'This program is open source — anyone can review the code on GitHub.' },
    { title: 'Setup wizard — Enter Pi info', desc: 'A setup window will appear automatically when you run the program.', code: '• Pi username: Your nickname from the Pi app\n  (e.g. piuser123)\n• Click "Save and Start"', note: 'Find your username in Pi app → Profile → the name after @' },
    { title: 'Confirm monitoring started', desc: 'After setup, the program will automatically start monitoring your node.', code: '🟢 Green — Node running normally\n🟡 Yellow — Warning\n🔴 Red — Critical\n⚪ Gray — Starting', note: 'Very lightweight: ~25-40MB RAM, 0-0.1% CPU.' },
    { title: 'Check status from Pi Browser', desc: 'Now open pilink.vercel.app in Pi Browser on your phone to see your node status in real time.', note: 'Register your PC node ID in your profile to link them.' },
    { title: 'Auto-start on reboot (highly recommended)', desc: 'Set NodeGuardian to start automatically when your PC reboots.', code: '① Right-click NodeGuardian.exe → "Create shortcut"\n② Press Win+R → type shell:startup\n③ Paste the shortcut in the opened folder\n\n✅ Now it auto-starts on reboot.', note: 'Verify: Task Manager → Startup tab → NodeGuardian shows "Enabled"' },
  ],
}

const zhTW: GuideTexts = {
  header: 'LinkPi 新手指南',
  headerSub: '① 安裝 PC 程式 → ② 連接 Pi Browser',
  tabPc: '步驟1 · 安裝 PC 程式',
  tabPi: '步驟2 · 連接 Pi Browser',
  tabPiDesc: '步驟2 · 請先完成 PC 安裝 · 在 Pi Browser 開啟 pilink.vercel.app',
  tabPcDesc: '請先完成步驟1！· 需要先安裝 PC 程式才能連接 Pi Browser',
  download: '下載 NodeGuardian.exe',
  downloadNote: 'Windows 10/11 · 免安裝 · 免費',
  footer: '安裝過程中遇到問題？請在問答區提問！',
  firstVisit: '第一次來嗎？',
  firstVisitSub: '查看 LinkPi 新手指南！',
  viewGuide: '查看指南',
  later: '稍後',
  guide: '指南',
  piSteps: [
    { title: '開啟 Pi App 並進入瀏覽器', desc: '在手機上開啟 Pi Network App，點擊底部的地球圖示「Browser」。', note: 'Pi Browser 內建於 Pi App 中，無需另外安裝。' },
    { title: '輸入網址', desc: '點擊 Pi Browser 頂部的網址列，輸入以下地址。', code: 'pilink.vercel.app' },
    { title: '點擊「Pi 登入」按鈕', desc: '右上角會看到紫色的「Pi 登入」按鈕，請點擊它。', note: '此按鈕僅在 Pi Browser 中顯示。' },
    { title: 'Pi 帳號驗證', desc: '出現驗證彈窗時，點擊「Allow」即可自動登入。', warn: '如果彈窗未出現，請重新啟動 Pi App 再試。' },
    { title: '查看節點狀態', desc: '登入後可在總覽頁面即時查看節點狀態、連接埠和事件記錄。', note: '需要 Node Guardian PC 程式正在執行。' },
    { title: '設定 Telegram 通知（建議）', desc: 'Pi Browser 不支援網頁推播，建議使用 Telegram 接收通知。', code: '① 在 Telegram 搜尋 @serge_node_guardian_bot\n② 輸入 /start\n③ 複製 Chat ID\n④ 個人頁面 → Telegram 通知 → 輸入 ID 並連線', note: '連線成功後會收到 Telegram 確認訊息。' },
  ],
  pcSteps: [
    { title: '從 PC 瀏覽器訪問網站', desc: '使用 Chrome、Edge 等瀏覽器開啟以下網址。', code: 'pilink.vercel.app', note: '下載按鈕僅在 PC 上顯示。' },
    { title: '點擊「下載程式」按鈕', desc: '點擊右上角的紫色「下載程式」按鈕下載 NodeGuardian.exe。', warn: '如果瀏覽器阻擋下載，請點擊「保留」繼續。' },
    { title: '處理 Windows 安全警告', desc: '首次執行時可能出現 SmartScreen 警告，這是正常的。', code: '① 點擊「更多資訊」\n② 點擊「仍要執行」', note: '此程式為開源軟體，任何人都可以在 GitHub 上查看原始碼。' },
    { title: '設定精靈 — 輸入 Pi 資訊', desc: '程式會自動顯示設定視窗。', code: '• Pi 用戶名：Pi App 中的暱稱\n  （例：piuser123）\n• 點擊「儲存並開始」', note: '在 Pi App → 個人資料中查看 @ 後面的名稱。' },
    { title: '確認監控已開始', desc: '設定完成後程式會自動開始監控節點。', code: '🟢 綠色 — 正常運行\n🟡 黃色 — 警告\n🔴 紅色 — 危險\n⚪ 灰色 — 啟動中', note: '非常輕量：約 25-40MB RAM，0-0.1% CPU。' },
    { title: '在 Pi Browser 中查看狀態', desc: '在手機 Pi Browser 開啟 pilink.vercel.app 即可即時查看節點狀態。', note: '請在個人資料中註冊 PC 節點編號以完成連接。' },
    { title: '設定開機自動啟動（強烈建議）', desc: '設定 PC 重新開機時自動執行 NodeGuardian。', code: '① 右鍵 NodeGuardian.exe →「建立捷徑」\n② Win+R → 輸入 shell:startup\n③ 將捷徑貼到開啟的資料夾\n\n✅ 現在重新開機會自動執行。', note: '確認：工作管理員 → 啟動 → NodeGuardian 顯示「已啟用」' },
  ],
}

const vi: GuideTexts = {
  header: 'Hướng dẫn LinkPi',
  headerSub: '① Cài chương trình PC → ② Kết nối Pi Browser',
  tabPc: 'Bước 1 · Cài chương trình PC',
  tabPi: 'Bước 2 · Kết nối Pi Browser',
  tabPiDesc: 'Bước 2 · Hoàn thành cài đặt PC trước · Mở pilink.vercel.app trong Pi Browser',
  tabPcDesc: 'Bước 1 trước! · Cần cài chương trình PC trước khi kết nối Pi Browser',
  download: 'Tải NodeGuardian.exe',
  downloadNote: 'Windows 10/11 · Không cần cài đặt · Miễn phí',
  footer: 'Gặp vấn đề? Hãy hỏi trong mục Hỏi đáp!',
  firstVisit: 'Lần đầu ghé thăm?',
  firstVisitSub: 'Xem hướng dẫn bắt đầu LinkPi!',
  viewGuide: 'Xem hướng dẫn',
  later: 'Để sau',
  guide: 'Hướng dẫn',
  piSteps: [
    { title: 'Mở Pi App và vào tab Browser', desc: 'Mở ứng dụng Pi Network trên điện thoại. Nhấn vào biểu tượng quả địa cầu "Browser" ở thanh dưới.', note: 'Pi Browser được tích hợp sẵn trong Pi App — không cần cài riêng.' },
    { title: 'Nhập địa chỉ trang web', desc: 'Nhấn vào thanh địa chỉ Pi Browser và nhập địa chỉ bên dưới.', code: 'pilink.vercel.app' },
    { title: 'Nhấn nút "Đăng nhập Pi"', desc: 'Bạn sẽ thấy nút tím "Đăng nhập Pi" ở góc trên bên phải. Nhấn vào nó.', note: 'Nút này chỉ hiển thị trong Pi Browser.' },
    { title: 'Xác thực tài khoản Pi', desc: 'Khi popup xác thực xuất hiện, nhấn "Allow" để đăng nhập tự động.', warn: 'Nếu popup không xuất hiện, khởi động lại Pi App và thử lại.' },
    { title: 'Kiểm tra trạng thái node', desc: 'Sau khi đăng nhập, xem trạng thái node, cổng và nhật ký sự kiện theo thời gian thực.', note: 'Cần Node Guardian PC đang chạy để hiển thị trạng thái.' },
    { title: 'Cài đặt thông báo Telegram (khuyến nghị)', desc: 'Pi Browser không hỗ trợ thông báo đẩy web. Khuyến nghị dùng Telegram.', code: '① Tìm @serge_node_guardian_bot trên Telegram\n② Gửi /start\n③ Sao chép Chat ID\n④ Tab Cá nhân → Thông báo Telegram → Nhập ID và kết nối', note: 'Khi kết nối thành công, bạn sẽ nhận tin nhắn xác nhận trên Telegram.' },
  ],
  pcSteps: [
    { title: 'Truy cập trang web từ trình duyệt PC', desc: 'Mở Chrome, Edge hoặc trình duyệt bất kỳ trên PC và truy cập địa chỉ bên dưới.', code: 'pilink.vercel.app', note: 'Nút tải chỉ hiển thị trên PC.' },
    { title: 'Nhấn nút "Tải ứng dụng"', desc: 'Nhấn nút tím "Tải ứng dụng" ở góc trên bên phải để tải NodeGuardian.exe.', warn: 'Nếu trình duyệt chặn, nhấn "Keep" để tiếp tục.' },
    { title: 'Xử lý cảnh báo bảo mật Windows', desc: 'SmartScreen có thể hiển thị cảnh báo khi chạy lần đầu. Đây là bình thường.', code: '① Nhấn "More info"\n② Nhấn "Run anyway"', note: 'Chương trình này là mã nguồn mở — ai cũng có thể xem mã trên GitHub.' },
    { title: 'Trình hướng dẫn — Nhập thông tin Pi', desc: 'Cửa sổ cài đặt sẽ tự động hiển thị.', code: '• Tên Pi: Tên đăng nhập trong Pi App\n  (VD: piuser123)\n• Nhấn "Lưu và Bắt đầu"', note: 'Xem tên trong Pi App → Hồ sơ → tên sau @' },
    { title: 'Xác nhận giám sát đã bắt đầu', desc: 'Sau khi cài đặt, chương trình tự động giám sát node.', code: '🟢 Xanh — Node hoạt động bình thường\n🟡 Vàng — Cảnh báo\n🔴 Đỏ — Nghiêm trọng\n⚪ Xám — Đang khởi động', note: 'Rất nhẹ: ~25-40MB RAM, 0-0.1% CPU.' },
    { title: 'Kiểm tra trạng thái từ Pi Browser', desc: 'Mở pilink.vercel.app trong Pi Browser để xem trạng thái node theo thời gian thực.', note: 'Đăng ký mã node PC trong hồ sơ để liên kết.' },
    { title: 'Tự động khởi động khi khởi động lại PC (khuyến nghị)', desc: 'Cài đặt NodeGuardian tự động chạy khi PC khởi động lại.', code: '① Chuột phải NodeGuardian.exe → "Create shortcut"\n② Win+R → gõ shell:startup\n③ Dán shortcut vào thư mục mở ra\n\n✅ Giờ đây sẽ tự chạy khi khởi động lại.', note: 'Kiểm tra: Task Manager → Startup → NodeGuardian hiển thị "Enabled"' },
  ],
}

const guideTexts: Record<string, GuideTexts> = { ko, en, 'zh-TW': zhTW, vi }

export function getGuideTexts(locale: string): GuideTexts {
  return guideTexts[locale] ?? guideTexts.ko
}
