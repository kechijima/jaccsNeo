<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

interface HelpSection {
  id: string
  icon: string
  title: string
  summary: string
  points: string[]
}

const sections: HelpSection[] = [
  {
    id: 'dashboard',
    icon: 'heroicons:home',
    title: 'ダッシュボード',
    summary: 'ログイン後最初に表示される画面。よく使う機能へのショートカットをまとめています。',
    points: [
      'お気に入り登録したアプリ・スペースが上部に表示されます（アプリ・掲示板の画面で★アイコンから登録できます）',
      '参加中のスペースや直近の予定など、他の画面の情報をまとめて確認できます',
      '各カードをタップ／クリックすると、該当する画面に移動します',
    ],
  },
  {
    id: 'personal-data',
    icon: 'heroicons:identification',
    title: 'パーソナルデータ',
    summary: '担当している顧客・案件のデータを管理する画面です。',
    points: [
      '画面上部の絞り込みパネルで、条件を指定してデータを検索できます（該当件数も表示されます）',
      '一覧の各行をタップすると詳細を確認・編集できます',
      '新規登録は「新規」ボタンから行えます',
    ],
  },
  {
    id: 'services',
    icon: 'heroicons:squares-2x2',
    title: 'アプリ',
    summary: '業務で使う各種アプリ（外部サービス・社内ツールなど）の一覧です。',
    points: [
      'よく使うアプリは★アイコンでお気に入り登録すると、ダッシュボードの上部に表示されます',
      'アプリをタップすると起動・該当ページへ移動します',
    ],
  },
  {
    id: 'portal',
    icon: 'heroicons:chat-bubble-left-right',
    title: '掲示板（スペース）',
    summary: 'グループ・組合ごとの掲示板です。お知らせの確認や投稿ができます。',
    points: [
      'スペース一覧から入りたいスペースを選択します。参加しているスペースは「参加スペース」にまとめて表示されます',
      'スペース内の「投稿する」から新しい投稿ができます（画像添付・メンションにも対応）',
      '投稿にはコメント・リアクションができます',
      'スペース上部の絞り込みで、投稿を条件別に表示できます',
      'メンション（@ユーザー名）された相手には通知が届きます',
    ],
  },
  {
    id: 'events',
    icon: 'heroicons:calendar-days',
    title: 'カレンダー',
    summary: 'イベント・会議の予定を管理する画面です。',
    points: [
      'カレンダー上の日付をクリック（タップ）すると、その日付でイベントを新規作成できます',
      '登録済みのイベントをタップすると詳細を確認・編集できます',
      '参加者には通知やリマインドが届きます',
    ],
  },
  {
    id: 'team',
    icon: 'heroicons:chart-bar',
    title: 'チーム',
    summary: 'グループ・組合ごとのメンバー一覧や実績を確認できます（EM2以上のロールで表示されます）。',
    points: [
      '「メンバー一覧」からグループ・組合ごとのメンバーを確認できます（脱退済みのメンバーは表示されません）',
      '「ディレクター逆引き」で、ディレクター名から担当している組合・役割を検索できます',
      'メンバー名をタップすると、そのメンバーのプロフィールを確認できます',
    ],
  },
  {
    id: 'requests',
    icon: 'heroicons:document-check',
    title: '申請',
    summary: '組合・グループ登録、プラン変更、サポート者変更、組合員の脱退、組合の解体などを申請する画面です。',
    points: [
      '「新規申請」から申請種別を選び、必要事項を入力して申請します（送信前に確認ダイアログが表示されます）',
      '申請一覧では、自分が行った申請の状況（承認待ち・承認済み・却下）と、申請者・承認者を確認できます',
      'ステータスや申請日で一覧を絞り込めます',
      '承認待ちの申請は、内容を修正したい場合「編集する」から再編集できます',
      '却下された申請は「コピーして再申請」で内容を引き継いで再申請できます',
      '理事会メンバー・システム管理者には、新しい申請が届くと通知が届きます（「承認キュー」から確認・承認/却下できます）',
    ],
  },
  {
    id: 'mypage',
    icon: 'heroicons:user-circle',
    title: 'マイページ',
    summary: '自分のプロフィール情報を確認・編集する画面です。',
    points: [
      '基本情報・口座情報・自己紹介などを編集できます',
      '編集内容は保存ボタンを押すまで反映されません',
    ],
  },
  {
    id: 'notifications',
    icon: 'heroicons:bell',
    title: '通知',
    summary: 'メンション・コメント・イベント作成・申請結果などのお知らせが届きます。',
    points: [
      '未読の通知は件数バッジで表示されます（サイドバー／ヘッダーのベルアイコン）',
      '通知をタップすると関連する画面に移動します',
      '受け取る通知の種類は「設定」画面で個別にオン・オフできます',
    ],
  },
  {
    id: 'settings',
    icon: 'heroicons:cog-6-tooth',
    title: '設定',
    summary: '通知設定やパスワード変更など、アプリ全体の設定を行う画面です。',
    points: [
      '通知の受け取り種別（メンション・コメント・イベント・システムのお知らせ）を切り替えられます',
      'パスワードの再設定メールを送信できます',
    ],
  },
  {
    id: 'admin',
    icon: 'heroicons:shield-check',
    title: '管理者設定',
    summary: 'システム管理者向けの画面です（ユーザー管理・グループ管理など）。',
    points: [
      'ユーザー管理では、ユーザーの検索・絞り込み・編集ができます。脱退済みのユーザーは既定では表示されません（絞り込みで表示可能）',
      'グループ・組合、アプリ、公開スペースなどの管理もここから行います',
    ],
  },
]

const expanded = ref<string[]>(['requests'])
const toggle = (id: string) => {
  expanded.value = expanded.value.includes(id)
    ? expanded.value.filter(x => x !== id)
    : [...expanded.value, id]
}
const expandAll = () => { expanded.value = sections.map(s => s.id) }
const collapseAll = () => { expanded.value = [] }
</script>

<template>
  <div class="p-4 md:p-6 max-w-3xl mx-auto space-y-5">

    <!-- ヘッダー -->
    <div class="flex items-start justify-between gap-3 flex-wrap">
      <div>
        <h1 class="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Icon name="heroicons:book-open" class="h-6 w-6 text-primary-600" />
          マニュアル
        </h1>
        <p class="text-sm text-gray-500 mt-0.5">各画面の使い方をまとめています。困ったときはここを確認してください。</p>
      </div>
      <div class="flex items-center gap-2 text-xs shrink-0">
        <button class="text-primary-600 hover:underline" @click="expandAll">すべて開く</button>
        <span class="text-gray-300">|</span>
        <button class="text-primary-600 hover:underline" @click="collapseAll">すべて閉じる</button>
      </div>
    </div>

    <!-- セクション一覧 -->
    <div class="space-y-2">
      <div v-for="s in sections" :key="s.id" class="card overflow-hidden">
        <button
          class="w-full flex items-center justify-between gap-3 px-5 py-4 text-left"
          @click="toggle(s.id)"
        >
          <div class="flex items-center gap-3 min-w-0">
            <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-600">
              <Icon :name="s.icon" class="h-5 w-5" />
            </div>
            <div class="min-w-0">
              <p class="font-semibold text-gray-900">{{ s.title }}</p>
              <p class="text-xs text-gray-500 truncate">{{ s.summary }}</p>
            </div>
          </div>
          <Icon
            name="heroicons:chevron-down"
            class="h-5 w-5 text-gray-400 shrink-0 transition-transform"
            :class="expanded.includes(s.id) ? 'rotate-180' : ''"
          />
        </button>

        <div v-if="expanded.includes(s.id)" class="px-5 pb-4">
          <ul class="space-y-1.5 border-t border-gray-100 pt-3">
            <li v-for="(p, i) in s.points" :key="i" class="flex items-start gap-2 text-sm text-gray-600">
              <Icon name="heroicons:check" class="h-4 w-4 text-primary-400 shrink-0 mt-0.5" />
              <span>{{ p }}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <p class="text-xs text-gray-400 text-center pt-2">
      上記で解決しない場合は、理事会メンバーまたはシステム管理者にお問い合わせください。
    </p>

  </div>
</template>
