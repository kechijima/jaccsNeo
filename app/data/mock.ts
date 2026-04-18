import type { Customer } from '~/types/customer'

// ─── 日付ヘルパー ─────────────────────────────────────────────────────────────
const d = (offsetDays: number): Date => {
  const dt = new Date('2026-04-13T00:00:00')
  dt.setDate(dt.getDate() + offsetDays)
  return dt
}
const ts = (offsetDays: number) => ({
  toDate: () => d(offsetDays),
  seconds: Math.floor(d(offsetDays).getTime() / 1000),
  nanoseconds: 0,
})

// ─── 管理ユーザー ─────────────────────────────────────────────────────────────
export const MOCK_ADMIN_USERS = [
  {
    uid: 'user-001', displayName: '西島 伸樹', email: 'nishijima@example.com',
    role: 'em2', groupId: 'reterace', position: '部長',
    lastName: '西島', firstName: '伸樹', lastNameKana: 'ニシジマ', firstNameKana: 'ノブキ',
    mobile: '090-1000-0001', birthday: '1978-05-12', kumiaiJoinDate: '2010-04-01',
    selfIntro: 'FP歴15年。お客様の夢実現を全力でサポートします。',
  },
  {
    uid: 'user-002', displayName: '山田 一郎', email: 'yamada@example.com',
    role: 'fp', groupId: 'reterace', position: 'FP',
    lastName: '山田', firstName: '一郎', lastNameKana: 'ヤマダ', firstNameKana: 'イチロウ',
    mobile: '090-1000-0002', birthday: '1985-08-20', kumiaiJoinDate: '2015-07-01',
    selfIntro: 'お客様の状況を丁寧にヒアリングし最適なプランをご提案します。',
  },
  {
    uid: 'user-003', displayName: '佐藤 花子', email: 'sato@example.com',
    role: 'fp', groupId: 'miraito', position: 'FP',
    lastName: '佐藤', firstName: '花子', lastNameKana: 'サトウ', firstNameKana: 'ハナコ',
    mobile: '090-1000-0003', birthday: '1990-03-15', kumiaiJoinDate: '2018-04-01',
    selfIntro: '女性FPとして丁寧なご相談対応を心がけています。',
  },
  {
    uid: 'user-004', displayName: '鈴木 二郎', email: 'suzuki@example.com',
    role: 'fp', groupId: 'asset', position: 'FP',
    lastName: '鈴木', firstName: '二郎', lastNameKana: 'スズキ', firstNameKana: 'ジロウ',
    mobile: '090-1000-0004', birthday: '1982-11-03', kumiaiJoinDate: '2012-10-01',
    selfIntro: '資産形成・相続対策が専門です。',
  },
  {
    uid: 'user-005', displayName: '田中 三郎', email: 'tanaka@example.com',
    role: 'fp', groupId: 'miraito', position: 'FP',
    lastName: '田中', firstName: '三郎', lastNameKana: 'タナカ', firstNameKana: 'サブロウ',
    mobile: '090-1000-0005', birthday: '1987-06-28', kumiaiJoinDate: '2017-01-01',
    selfIntro: '保険・不動産の総合的な相談に対応します。',
  },
  {
    uid: 'mock-user-123', displayName: 'テストユーザー', email: 'test@example.com',
    role: 'fp', groupId: 'reterace', position: 'FP',
    lastName: 'テスト', firstName: 'ユーザー', lastNameKana: 'テスト', firstNameKana: 'ユーザー',
    mobile: '090-0000-0000', birthday: '1995-01-01', kumiaiJoinDate: '2024-04-01',
    selfIntro: 'テスト用アカウントです。',
  },
]

// ─── 通知 ─────────────────────────────────────────────────────────────────────
export const MOCK_NOTIFICATIONS = [
  { id: 'n001', uid: 'mock-user-123', type: 'post_comment', title: '投稿にコメントがつきました', body: '山田一郎さんがあなたの投稿「4月の活動報告」にコメントしました。', isRead: false, linkUrl: '/portal/spaces/s001/posts/p001', relatedId: 'p001', createdAt: ts(-1) },
  { id: 'n002', uid: 'mock-user-123', type: 'mention',      title: 'メンションされました',   body: '佐藤花子さんが投稿であなたをメンションしました。',                 isRead: false, linkUrl: '/portal/spaces/s002/posts/p002', relatedId: 'p002', createdAt: ts(-1) },
  { id: 'n003', uid: 'mock-user-123', type: 'post_reaction', title: 'リアクションがつきました', body: '鈴木二郎さんがあなたの投稿に👍を押しました。',                  isRead: false, linkUrl: '/portal/spaces/s001/posts/p003', relatedId: 'p003', createdAt: ts(-2) },
  { id: 'n004', uid: 'mock-user-123', type: 'event_reminder', title: 'イベントのリマインダー', body: '「4月度チームミーティング」まで1日前です。',                     isRead: true,  linkUrl: '/events/ev001',                   relatedId: 'ev001', createdAt: ts(-2) },
  { id: 'n005', uid: 'mock-user-123', type: 'event_created', title: '新しいイベントが作成されました', body: '西島伸樹さんが「5月度全体会議」を作成しました。',           isRead: true,  linkUrl: '/events/ev002',                   relatedId: 'ev002', createdAt: ts(-3) },
  { id: 'n006', uid: 'mock-user-123', type: 'customer_assigned', title: '顧客が担当割り当てられました', body: '田中花子さんの担当FPに指定されました。',                 isRead: false, linkUrl: '/customers/c002',                 relatedId: 'c002', createdAt: ts(-3) },
  { id: 'n007', uid: 'mock-user-123', type: 'meeting_created', title: '商談が登録されました', body: '2026年4月18日 14:00 田中花子さんとの商談が登録されました。',       isRead: true,  linkUrl: '/meetings/m001',                  relatedId: 'm001', createdAt: ts(-4) },
  { id: 'n008', uid: 'mock-user-123', type: 'mention',      title: 'メンションされました',   body: '田中三郎さんがコメントであなたをメンションしました。',               isRead: false, linkUrl: '/portal/spaces/s003/posts/p004', relatedId: 'p004', createdAt: ts(-4) },
  { id: 'n009', uid: 'mock-user-123', type: 'post_comment', title: '投稿にコメントがつきました', body: '西島伸樹さんがあなたの投稿「新規顧客獲得に向けて」にコメントしました。', isRead: true, linkUrl: '/portal/spaces/s001/posts/p005', relatedId: 'p005', createdAt: ts(-5) },
  { id: 'n010', uid: 'mock-user-123', type: 'event_reminder', title: 'イベントのリマインダー', body: '「社内研修：資産形成の基礎」まで3日前です。',                    isRead: true,  linkUrl: '/events/ev003',                   relatedId: 'ev003', createdAt: ts(-6) },
  { id: 'n011', uid: 'mock-user-123', type: 'system',        title: 'システムメンテナンスのお知らせ', body: '4月20日 2:00〜4:00 はシステムメンテナンスを実施します。', isRead: true,  linkUrl: undefined,                        relatedId: undefined, createdAt: ts(-7) },
  { id: 'n012', uid: 'mock-user-123', type: 'post_reaction', title: 'リアクションがつきました', body: '佐藤花子さんがあなたの投稿に🎉を押しました。',                 isRead: true,  linkUrl: '/portal/spaces/s002/posts/p006', relatedId: 'p006', createdAt: ts(-8) },
]

// ─── スペース ─────────────────────────────────────────────────────────────────
export const MOCK_SPACES = [
  { id: 's001', name: '全体スペース',           type: 'all',     description: '全メンバーへの共有・連絡',  memberCount: 24, admins: ['user-001', 'mock-user-123'], isPinned: true,  isArchived: false, headerImage: '' },
  { id: 's002', name: 'Reteraceグループ活動報告', type: 'group',   description: 'Reteraceグループ専用スペース', memberCount: 8,  admins: ['user-001'],                   isPinned: true,  isArchived: false, headerImage: '' },
  { id: 's003', name: 'Miraitoグループ活動報告',  type: 'group',   description: 'Miraitoグループ専用スペース', memberCount: 7,  admins: ['user-003'],                   isPinned: false, isArchived: false, headerImage: '' },
  { id: 's004', name: 'Assetグループ活動報告',    type: 'group',   description: 'Assetグループ専用スペース',  memberCount: 6,  admins: ['user-004'],                   isPinned: false, isArchived: false, headerImage: '' },
  { id: 's005', name: '第1組合',                 type: 'kumiai',  description: '第1組合のスペース',          memberCount: 12, admins: ['user-002'],                   isPinned: false, isArchived: false, headerImage: '' },
  { id: 's006', name: 'FP研修スペース',          type: 'special', description: '研修・勉強会の情報共有',     memberCount: 24, admins: ['user-001'],                   isPinned: false, isArchived: false, headerImage: '' },
]

// ─── イベント ─────────────────────────────────────────────────────────────────
export const MOCK_EVENTS = [
  { id: 'ev001', title: '4月度チームミーティング',   startAt: ts(1),  scope: 'all',   location: 'Zoom' },
  { id: 'ev002', title: '5月度全体会議',             startAt: ts(18), scope: 'all',   location: '本社会議室' },
  { id: 'ev003', title: '社内研修：資産形成の基礎',  startAt: ts(5),  scope: 'group', location: '研修室A' },
  { id: 'ev004', title: 'Reteraceグループ定例',      startAt: ts(3),  scope: 'group', location: 'Zoom' },
  { id: 'ev005', title: '第1組合 勉強会',            startAt: ts(10), scope: 'kumiai', location: '組合会館' },
]

// ─── 顧客データ ───────────────────────────────────────────────────────────────
export const MOCK_CUSTOMERS: Customer[] = [
  // ── ワン中（アポ確定） ──
  {
    id: 'c001', type: 'individual', name: '鈴木 太郎',  nameKana: 'スズキ タロウ',
    tel: '090-1234-5601', email: 'suzuki.t@example.com',
    assignedFpId: 'user-002', assignedFpName: '山田 一郎',
    relationship: '知人', stage: '2段', status1: 'ワン中', one: '連絡済み',
    appointment1: { place: 'スターバックス 福岡天神', date: '2026-04-16 14:00', note: '初回面談' },
    createdAt: d(-60), updatedAt: d(-5),
  },
  {
    id: 'c002', type: 'individual', name: '田中 花子',  nameKana: 'タナカ ハナコ',
    tel: '090-1234-5602', email: 'tanaka.h@example.com',
    assignedFpId: 'user-003', assignedFpName: '佐藤 花子',
    relationship: '紹介', stage: '1段', status1: 'ワン中', one: '連絡済み',
    appointment1: { place: '事務所（福岡市中央区）', date: '2026-04-15 10:00', note: '紹介経由' },
    createdAt: d(-45), updatedAt: d(-3),
  },
  {
    id: 'c009', type: 'individual', name: '松本 直樹',  nameKana: 'マツモト ナオキ',
    tel: '090-1234-5609', email: 'matsumoto@example.com',
    assignedFpId: 'user-005', assignedFpName: '田中 三郎',
    relationship: '紹介', stage: '1段', status1: 'ワン中', one: '連絡済み',
    appointment1: { place: 'ドトール 博多駅前', date: '2026-04-17 13:00', note: '友人紹介' },
    createdAt: d(-20), updatedAt: d(-2),
  },
  {
    id: 'c014', type: 'individual', name: '藤田 恵子',  nameKana: 'フジタ ケイコ',
    tel: '090-1234-5614', email: 'fujita@example.com',
    assignedFpId: 'user-005', assignedFpName: '田中 三郎',
    relationship: '組合員', stage: '2段', status1: 'ワン中', one: '連絡済み',
    appointment1: { place: 'カフェ・ド・クリエ 天神', date: '2026-04-22 11:00', note: '組合紹介' },
    createdAt: d(-30), updatedAt: d(-1),
  },
  // ── ツー中（アポ確定） ──
  {
    id: 'c003', type: 'individual', name: '木村 次郎',  nameKana: 'キムラ ジロウ',
    tel: '090-1234-5603', email: 'kimura@example.com',
    assignedFpId: 'user-002', assignedFpName: '山田 一郎',
    relationship: '組合員', stage: '3段', status1: 'ワン済み', status2: 'ツー中', two: '調整中',
    appointment2: { place: 'Zoom', date: '2026-04-18 16:00', note: 'プラン提案' },
    createdAt: d(-90), updatedAt: d(-7),
  },
  {
    id: 'c011', type: 'individual', name: '井上 正',    nameKana: 'イノウエ タダシ',
    tel: '090-1234-5611', email: 'inoue@example.com',
    assignedFpId: 'user-002', assignedFpName: '山田 一郎',
    relationship: '組合員', stage: '2段', status1: 'ワン済み', status2: 'ツー中', two: '連絡済み',
    appointment2: { place: 'Zoom', date: '2026-04-20 15:00', note: 'ツーアポ確定' },
    createdAt: d(-75), updatedAt: d(-4),
  },
  {
    id: 'c017', type: 'individual', name: '中島 大輔',  nameKana: 'ナカジマ ダイスケ',
    tel: '090-1234-5617', email: 'nakajima@example.com',
    assignedFpId: 'user-003', assignedFpName: '佐藤 花子',
    relationship: '紹介', stage: '2段', status1: 'ワン済み', status2: 'ツー中', two: '連絡済み',
    appointment2: { place: '事務所（福岡市博多区）', date: '2026-04-15 14:00', note: 'ツーアポ' },
    createdAt: d(-55), updatedAt: d(-3),
  },
  // ── アポ調整中 ──
  {
    id: 'c006', type: 'individual', name: '伊藤 さくら', nameKana: 'イトウ サクラ',
    tel: '090-1234-5606', email: 'ito.sakura@example.com',
    assignedFpId: 'user-002', assignedFpName: '山田 一郎',
    relationship: '新規', stage: '1段', status1: 'アポ調整中', one: '連絡中',
    createdAt: d(-15), updatedAt: d(-1),
  },
  {
    id: 'c010', type: 'individual', name: '山口 明日香', nameKana: 'ヤマグチ アスカ',
    tel: '090-1234-5610', email: 'yamaguchi@example.com',
    assignedFpId: 'user-004', assignedFpName: '鈴木 二郎',
    relationship: '知人', stage: '2段', status1: 'アポ調整中', one: '連絡中',
    createdAt: d(-25), updatedAt: d(-2),
  },
  {
    id: 'c015', type: 'individual', name: '高木 雅人',  nameKana: 'タカギ マサト',
    tel: '090-1234-5615', email: 'takagi@example.com',
    assignedFpId: 'user-004', assignedFpName: '鈴木 二郎',
    relationship: '新規', stage: '1段', status1: 'アポ調整中', one: '連絡中',
    createdAt: d(-10), updatedAt: d(-1),
  },
  // ── ワン済み（過去アポ） ──
  {
    id: 'c005', type: 'individual', name: '渡辺 健一',  nameKana: 'ワタナベ ケンイチ',
    tel: '090-1234-5605', email: 'watanabe@example.com',
    assignedFpId: 'user-005', assignedFpName: '田中 三郎',
    relationship: '紹介', stage: '2段', status1: 'ワン済み', one: '面談済み',
    appointment1: { place: '事務所', date: '2026-04-10 14:00', note: 'ワンアポ完了' },
    createdAt: d(-80), updatedAt: d(-3),
  },
  {
    id: 'c018', type: 'individual', name: '村田 愛',    nameKana: 'ムラタ アイ',
    tel: '090-1234-5618', email: 'murata@example.com',
    assignedFpId: 'user-001', assignedFpName: '西島 伸樹',
    relationship: '組合員', stage: '2段', status1: 'ワン済み', one: '面談済み',
    appointment1: { place: '事務所', date: '2026-04-08 10:00', note: 'ワンアポ完了' },
    createdAt: d(-100), updatedAt: d(-5),
  },
  {
    id: 'c007', type: 'individual', name: '小林 哲夫',  nameKana: 'コバヤシ テツオ',
    tel: '090-1234-5607', email: 'kobayashi@example.com',
    assignedFpId: 'user-003', assignedFpName: '佐藤 花子',
    relationship: '知人', stage: '3段', status1: 'ワン済み', status2: 'ツー済み',
    appointment1: { place: '事務所', date: '2026-03-28 14:00' },
    appointment2: { place: '事務所', date: '2026-04-12 11:00', note: 'ツーアポ完了→フォロー中' },
    createdAt: d(-120), updatedAt: d(-1),
  },
  // ── フォロー中 ──
  {
    id: 'c004', type: 'individual', name: '中村 美子',  nameKana: 'ナカムラ ヨシコ',
    tel: '090-1234-5604', email: 'nakamura@example.com',
    assignedFpId: 'user-004', assignedFpName: '鈴木 二郎',
    relationship: '知人', stage: '2段', status1: 'フォロー中',
    createdAt: d(-180), updatedAt: d(-14),
  },
  {
    id: 'c012', type: 'individual', name: '清水 恵美',  nameKana: 'シミズ エミ',
    tel: '090-1234-5612', email: 'shimizu@example.com',
    assignedFpId: 'user-003', assignedFpName: '佐藤 花子',
    relationship: '紹介', stage: '3段', status1: 'フォロー中', postFollowStatus: '検討中',
    createdAt: d(-150), updatedAt: d(-10),
  },
  // ── 成約 ──
  {
    id: 'c008', type: 'individual', name: '加藤 洋子',  nameKana: 'カトウ ヨウコ',
    tel: '090-1234-5608', email: 'kato@example.com',
    assignedFpId: 'user-001', assignedFpName: '西島 伸樹',
    relationship: '組合員', stage: '2段', status1: '成約',
    createdAt: d(-200), updatedAt: d(-30),
  },
  {
    id: 'c016', type: 'individual', name: '岡田 麻衣',  nameKana: 'オカダ マイ',
    tel: '090-1234-5616', email: 'okada@example.com',
    assignedFpId: 'user-002', assignedFpName: '山田 一郎',
    relationship: '知人', stage: '3段', status1: '成約',
    createdAt: d(-250), updatedAt: d(-45),
  },
  {
    id: 'c020', type: 'corporate', name: '株式会社 石田商事', nameKana: 'カブシキガイシャ イシダショウジ',
    tel: '092-234-5620', email: 'ishida@example.com',
    companyName: '株式会社 石田商事', ceoName: '石田 悦子',
    assignedFpId: 'user-004', assignedFpName: '鈴木 二郎',
    relationship: '組合員', stage: '3段', status1: '成約',
    createdAt: d(-300), updatedAt: d(-60),
  },
  // ── 未着手 ──
  {
    id: 'c013', type: 'individual', name: '橋本 義雄',  nameKana: 'ハシモト ヨシオ',
    tel: '090-1234-5613', email: 'hashimoto@example.com',
    assignedFpId: 'user-001', assignedFpName: '西島 伸樹',
    relationship: '知人', stage: '1段', status1: '未着手',
    createdAt: d(-5), updatedAt: d(-5),
  },
  {
    id: 'c019', type: 'individual', name: '長谷川 翔',  nameKana: 'ハセガワ ショウ',
    tel: '090-1234-5619', email: 'hasegawa@example.com',
    assignedFpId: 'user-005', assignedFpName: '田中 三郎',
    relationship: '知人', stage: '1段', status1: '未着手',
    createdAt: d(-3), updatedAt: d(-3),
  },
]

// ─── チーム：新規顧客獲得推移 ─────────────────────────────────────────────────
export const MOCK_MONTHLY_NEW_CLIENTS = [
  { month: '11月', reterace: 8,  miraito: 5, asset: 4, total: 17 },
  { month: '12月', reterace: 6,  miraito: 7, asset: 3, total: 16 },
  { month: '1月',  reterace: 9,  miraito: 6, asset: 5, total: 20 },
  { month: '2月',  reterace: 7,  miraito: 8, asset: 6, total: 21 },
  { month: '3月',  reterace: 11, miraito: 7, asset: 7, total: 25 },
  { month: '4月',  reterace: 5,  miraito: 4, asset: 3, total: 12 },
]

// ─── チーム：FP詳細 ───────────────────────────────────────────────────────────
export const MOCK_FP_DETAILS = [
  {
    id: 'user-002', name: '山田 一郎', groupId: 'reterace',
    contracts: 12, activities: 38, newClients: 8, referrals: 5,
    recentContracts: [
      { customerName: '鈴木 太郎', product: '生命保険', date: '2026-03-28' },
      { customerName: '木村 次郎', product: '不動産（売買）', date: '2026-03-15' },
      { customerName: '岡田 麻衣', product: '火災保険', date: '2026-02-20' },
    ],
  },
  {
    id: 'user-003', name: '佐藤 花子', groupId: 'miraito',
    contracts: 10, activities: 32, newClients: 6, referrals: 4,
    recentContracts: [
      { customerName: '田中 花子', product: '生命保険', date: '2026-03-25' },
      { customerName: '清水 恵美', product: '通信', date: '2026-03-10' },
    ],
  },
  {
    id: 'user-004', name: '鈴木 二郎', groupId: 'asset',
    contracts: 9, activities: 29, newClients: 5, referrals: 3,
    recentContracts: [
      { customerName: '石田 悦子', product: '不動産（賃貸）', date: '2026-03-20' },
      { customerName: '加藤 洋子', product: '相続対策', date: '2026-02-28' },
    ],
  },
  {
    id: 'user-005', name: '田中 三郎', groupId: 'miraito',
    contracts: 7, activities: 25, newClients: 7, referrals: 6,
    recentContracts: [
      { customerName: '渡辺 健一', product: '生命保険', date: '2026-03-18' },
    ],
  },
  {
    id: 'user-001', name: '西島 伸樹', groupId: 'reterace',
    contracts: 15, activities: 45, newClients: 10, referrals: 8,
    recentContracts: [
      { customerName: '加藤 洋子', product: '生命保険', date: '2026-03-30' },
      { customerName: '村田 愛', product: '不動産（売買）', date: '2026-03-22' },
      { customerName: '橋本 義雄', product: '生命保険', date: '2026-03-05' },
    ],
  },
]

// ─── ポータル投稿 ─────────────────────────────────────────────────────────────
// usePortalStore が MOCK_POSTS[spaceId] を参照する
// 各投稿は createdAt.toDate() が呼べる Timestamp-like オブジェクトが必要
export const MOCK_POSTS: Record<string, Array<{
  id: string; authorId: string; authorName: string; content: string
  reactions?: Record<string, number>; commentCount?: number
  isPinned?: boolean; createdAt: ReturnType<typeof ts>
}>> = {
  s001: [
    {
      id: 'p001', authorId: 'user-001', authorName: '西島 伸樹',
      isPinned: true, reactions: { '👍': 8, '🔥': 5 }, commentCount: 3, createdAt: ts(-1),
      content: `<p><strong>【4月度 全体方針・目標共有】</strong></p>
<p>メンバーの皆さん、お疲れ様です。4月の全体方針を共有します。</p>
<p><strong>【今月の全体目標】</strong></p>
<p>・新規ワンアポ獲得：チーム合計 <strong>30件</strong><br>・ツーアポ転換率：60%以上<br>・成約件数：チーム合計 <strong>8件</strong></p>
<p><strong>【重点施策】</strong></p>
<p>① 紹介依頼の徹底<br>　既存のお客様・組合員へのご紹介依頼を積極的に実施してください。<br>　特に成約後のお客様は紹介率が高いため、フォローアップ時に一声かけましょう。</p>
<p>② アポ質の向上<br>　ワンアポ前に必ず事前リサーチを行い、お客様の状況・ニーズを把握した上で臨んでください。<br>　面談後は必ずCRMに記録し、次のアクションを明確にしておくこと。</p>
<p>③ 勉強会・ロープレへの積極参加<br>　毎週水曜日のロープレは強制参加ではありませんが、成績上位者は全員参加しています。<br>　スキルアップの絶好の機会ですので、ぜひ活用してください。</p>
<p><strong>【連絡事項】</strong></p>
<p>・4月18日（金）17時より、月次全体ミーティングを開催します（Zoom）<br>・来週から新しいCRMの入力フォームに切り替わります。操作マニュアルは別途共有します<br>・5月の研修日程が決まりました。詳細はイベントページをご確認ください</p>
<p>今月もチーム一丸となって頑張りましょう！何か質問があればいつでも声をかけてください。</p>`,
    },
    {
      id: 'p003', authorId: 'user-002', authorName: '山田 一郎',
      reactions: { '👍': 4, '👏': 2 }, commentCount: 2, createdAt: ts(-3),
      content: `<p><strong>【週次活動報告】4月14日（月）〜 4月18日（金）</strong></p>
<p>山田一郎です。今週の活動を報告します。</p>
<p><strong>【今月の目標】</strong></p>
<p>・ワンアポ獲得：5件<br>・ツーアポ転換：3件<br>・成約：2件</p>
<p><strong>【今週のコミット】</strong></p>
<p>・月曜：既存客フォロー連絡10件<br>・火曜：鈴木様とワンアポ実施（結果：ツーアポ確定）<br>・水曜：ロープレ参加 + 新規リスト整理<br>・木曜：田中様・木村様と面談<br>・金曜：週次レポート作成 + 来週のアポ調整</p>
<p><strong>【今週の実績】</strong></p>
<p>・新規コンタクト：8件<br>・ワンアポ実施：<strong>3件</strong>（鈴木様・田中様・木村様）<br>・ツーアポ確定：<strong>2件</strong>（鈴木様 → 4/22確定、木村様 → 4/24確定）<br>・成約：<strong>1件</strong>（前週ツーアポの石川様 生命保険成約）<br>・紹介獲得：1件（石川様からのご紹介）</p>
<p><strong>【来週のアクション】</strong></p>
<p>・鈴木様ツーアポ（4/22）：プラン資料を火曜までに準備<br>・木村様ツーアポ（4/24）：相続プラン中心で提案予定<br>・新規リストへのアプローチ：最低5件コンタクト<br>・石川様ご紹介の渡辺様へ連絡（来週中）</p>
<p>今週は成約1件＋ツーアポ2件と好調でした。来週もこの流れを維持できるよう全力で取り組みます！</p>`,
    },
    {
      id: 'p005', authorId: 'mock-user-123', authorName: 'テストユーザー',
      reactions: { '👏': 3, '❤️': 2, '😊': 1 }, commentCount: 4, createdAt: ts(-5),
      content: `<p><strong>【週次活動報告】4月7日（月）〜 4月11日（金）</strong></p>
<p>テストユーザーです。今週の活動を報告します。</p>
<p><strong>【今月の目標】</strong></p>
<p>・ワンアポ獲得：4件<br>・ツーアポ転換：2件<br>・成約：1件</p>
<p><strong>【今週のコミット】</strong></p>
<p>・月曜：組合員リストへの電話アプローチ（15件予定）<br>・火曜：山田様とワンアポ実施<br>・水曜：ロープレ参加（新商品の説明練習）<br>・木曜：既存客フォロー連絡<br>・金曜：来月のセミナー準備</p>
<p><strong>【今週の実績】</strong></p>
<p>・新規コンタクト：<strong>12件</strong>（目標15件に対し未達、来週挽回）<br>・ワンアポ実施：<strong>2件</strong>（山田様・加藤様）<br>・ツーアポ確定：<strong>1件</strong>（山田様 → 4/18確定）<br>・成約：0件<br>・紹介獲得：0件</p>
<p><strong>【振り返り・気づき】</strong></p>
<p>今週は新規コンタクトが目標に届きませんでした。<br>電話で繋がれない方が多く、時間帯の工夫が必要だと感じています。<br>先週の西島部長のアドバイスを参考に、夕方（17〜19時）のコンタクトを増やしていきます。</p>
<p>また、山田様のワンアポでは商品説明に時間をかけすぎてしまい、お客様のニーズを深掘りする時間が不足しました。<br>来週のロープレでヒアリング力を磨いていきます。</p>
<p><strong>【来週のアクション】</strong></p>
<p>・山田様ツーアポ（4/18）：ニーズに合わせたプラン提案準備<br>・夕方のコンタクト強化：17〜19時に5件以上<br>・紹介依頼：既存客3名に対して実施<br>・ロープレ参加：水曜必ず出席</p>`,
    },
  ],
  s002: [
    {
      id: 'p002', authorId: 'user-001', authorName: '西島 伸樹',
      isPinned: true, reactions: { '👍': 6, '🔥': 4 }, commentCount: 2, createdAt: ts(-1),
      content: `<p><strong>【Reteraceグループ 活動報告スペース 運営方針】</strong></p>
<p>Reteraceメンバーの皆さん、こんにちは。西島です。</p>
<p><strong>【このスペースの目的】</strong></p>
<p>日々の商売活動をありのままアウトプットしていき、レベルの高い人とのギャップを埋めていくことを目的としています。<br>恥ずかしがらずに、正直に現状を書いてください。失敗も含めてシェアすることで、チーム全体が成長できます。</p>
<p><strong>【推奨記載内容】</strong></p>
<p>・今月の目標と今週のコミット<br>・今週の実績（アポ件数・成約・紹介など）<br>・うまくいったこと・うまくいかなかったこと<br>・来週のアクション計画</p>
<p><strong>【投稿のルール】</strong></p>
<p>① 毎週金曜日までに週次報告を投稿する<br>② 他メンバーの投稿には必ずリアクションまたはコメントで応答する<br>③ 数字は正直に記載する（良い時も悪い時も）<br>④ 困ったことがあれば遠慮なく投稿する</p>
<p><strong>【グループ今月の目標】</strong></p>
<p>・ワンアポ合計：<strong>15件</strong><br>・成約合計：<strong>4件</strong><br>・紹介獲得：<strong>6件</strong></p>
<p>お互いを高め合い、Reteraceを最強のチームにしていきましょう！</p>`,
    },
    {
      id: 'p007', authorId: 'user-002', authorName: '山田 一郎',
      reactions: { '🎉': 5, '👍': 4, '👏': 3 }, commentCount: 3, createdAt: ts(-3),
      content: `<p><strong>【週次活動報告】4月14日（月）〜 4月18日（金）</strong></p>
<p>山田一郎です。今週の報告です。</p>
<p><strong>【今月の目標】</strong></p>
<p>・ワンアポ：5件（現在 3件 ✅）<br>・ツーアポ転換：3件（現在 2件）<br>・成約：2件（現在 1件）</p>
<p><strong>【今週のコミット達成度】</strong></p>
<p>・既存客フォロー：10件 → 実績 <strong>12件 ✅</strong><br>・ワンアポ実施：2件 → 実績 <strong>3件 ✅</strong><br>・ロープレ参加：○<br>・CRM入力：毎日実施 ✅</p>
<p><strong>【今週の気づき・学び】</strong></p>
<p>鈴木様とのワンアポで、最初の10分間でしっかりラポールを築いたことで、後半のヒアリングがスムーズでした。<br>「なぜ保険を見直したいか」を深掘りしたところ、お子さんの大学進学が3年後という具体的な動機が出てきて、提案の方向性が明確になりました。</p>
<p>一方、田中様のアポでは商品説明に入るのが早すぎたと反省。もう少しニーズを掘り下げてからプレゼンすべきでした。<br>次回のツーアポでは改善します。</p>
<p><strong>【来週のアクション】</strong></p>
<p>・鈴木様ツーアポ（4/22）：終身保険プラン3パターン準備<br>・木村様ツーアポ（4/24）：相続・二次相続対策メイン<br>・田中様フォロー：資料送付後に電話確認<br>・新規アプローチ：5件以上コンタクト</p>`,
    },
    {
      id: 'p009', authorId: 'mock-user-123', authorName: 'テストユーザー',
      reactions: { '👍': 3, '😊': 2 }, commentCount: 1, createdAt: ts(-6),
      content: `<p><strong>【週次活動報告】4月7日（月）〜 4月11日（金）</strong></p>
<p>テストユーザーです。今週の報告します。正直に書きます。</p>
<p><strong>【今月の目標】</strong></p>
<p>・ワンアポ：4件（現在 1件）<br>・ツーアポ転換：2件（現在 0件）<br>・成約：1件（現在 0件）</p>
<p><strong>【今週の実績】</strong></p>
<p>・新規コンタクト：8件（目標10件に届かず）<br>・ワンアポ実施：<strong>1件</strong>（佐々木様）<br>・ツーアポ：0件<br>・成約：0件<br>・紹介：0件</p>
<p><strong>【正直な振り返り】</strong></p>
<p>今週は数字が出ませんでした。電話をかけるのに気持ちが乗らない日があり、コンタクト件数が伸びませんでした。</p>
<p>佐々木様とのアポは手ごたえがあったものの、「少し考えたい」との回答でした。次回のフォローが重要です。</p>
<p>西島部長のアドバイスにあった「断られることを恐れずにコンタクトし続ける」という姿勢をもっと意識します。</p>
<p><strong>【来週のアクション・コミット】</strong></p>
<p>・コンタクト：毎日3件以上（週15件目標）<br>・佐々木様フォロー：月曜に電話してツーアポ確定させる<br>・ロープレ：水曜必ず参加<br>・成功者に話を聞く：山田さんにアポの取り方を教わる<br>来週は必ず結果を出します！</p>`,
    },
  ],
  s003: [
    {
      id: 'p004', authorId: 'user-003', authorName: '佐藤 花子',
      reactions: { '👍': 5, '😊': 3, '👏': 2 }, commentCount: 2, createdAt: ts(-2),
      content: `<p><strong>【週次活動報告】4月14日（月）〜 4月18日（金）</strong></p>
<p>佐藤花子です。今週の活動報告です。</p>
<p><strong>【今月の目標】</strong></p>
<p>・ワンアポ獲得：4件（現在 3件 ✅）<br>・ツーアポ転換：2件（現在 2件 ✅）<br>・成約：1件（現在 0件）<br>・紹介獲得：2件（現在 1件）</p>
<p><strong>【今週のコミット達成度】</strong></p>
<p>・既存客連絡：8件 → 実績 <strong>9件 ✅</strong><br>・ワンアポ実施：2件 → 実績 <strong>2件 ✅</strong><br>・勉強会参加：1件 ✅<br>・ロープレ：○</p>
<p><strong>【今週の気づき】</strong></p>
<p>中島様とのアポで、お子さんの教育費の話から自然に医療保険の見直しへ繋げることができました。<br>「将来の不安」を具体的なエピソードで引き出すヒアリングが今週はうまくできたと思います。</p>
<p>また、田中様（既存客）からご紹介をいただけました。信頼関係構築の大切さを改めて実感しています。<br>ご紹介いただいた渡辺様とは来週アポを組む予定です。</p>
<p><strong>【来週のアクション】</strong></p>
<p>・中島様ツーアポ（4/15）：提案資料の最終確認<br>・渡辺様（ご紹介）：来週中にアポ設定<br>・既存客フォロー：5件連絡<br>・5月のセミナー準備：参加者リスト作成</p>`,
    },
    {
      id: 'p006', authorId: 'user-005', authorName: '田中 三郎',
      reactions: { '🎉': 4, '👍': 3 }, commentCount: 2, createdAt: ts(-5),
      content: `<p><strong>【週次活動報告】4月7日（月）〜 4月11日（金）</strong></p>
<p>田中三郎です。今週の報告をします。</p>
<p><strong>【今月の目標】</strong></p>
<p>・ワンアポ獲得：5件（現在 2件）<br>・ツーアポ転換：3件（現在 1件）<br>・成約：2件（現在 0件）</p>
<p><strong>【今週の実績】</strong></p>
<p>・新規コンタクト：<strong>14件</strong>（目標10件を上回ることができました）<br>・ワンアポ実施：<strong>2件</strong>（松本様・高橋様）<br>・ツーアポ確定：<strong>1件</strong>（松本様 → 4/18確定）<br>・成約：0件<br>・紹介獲得：<strong>2件</strong>（嬉しいです！）</p>
<p><strong>【紹介案件について】</strong></p>
<p>組合員の山本様から2件ご紹介をいただきました。先月から丁寧にフォローを続けてきた結果が出てきた感じです。<br>紹介をいただくには「定期的な連絡」と「成約後のフォロー」が大切だと改めて感じています。</p>
<p><strong>【来週のアクション】</strong></p>
<p>・松本様ツーアポ（4/18）：資産形成プランの提案<br>・ご紹介の増田様・藤原様：来週中にコンタクト<br>・高橋様フォロー：資料送付後に電話<br>・新規コンタクト：引き続き10件以上<br>・ロープレ参加：水曜</p>
<p>来週こそ成約を出せるよう頑張ります！</p>`,
    },
  ],
  s004: [
    {
      id: 'p008', authorId: 'user-004', authorName: '鈴木 二郎',
      reactions: { '👍': 4, '🔥': 2 }, commentCount: 1, createdAt: ts(-2),
      content: `<p><strong>【週次活動報告】4月14日（月）〜 4月18日（金）</strong></p>
<p>鈴木二郎です。今週の報告です。</p>
<p><strong>【今月の目標】</strong></p>
<p>・ワンアポ獲得：4件（現在 2件）<br>・ツーアポ転換：2件（現在 1件）<br>・成約：2件（現在 1件 ✅一部達成）<br>・相続・資産案件：1件以上（現在 1件 ✅）</p>
<p><strong>【今週のコミット達成度】</strong></p>
<p>・既存客フォロー：7件 → 実績 <strong>8件 ✅</strong><br>・ワンアポ実施：2件 → 実績 <strong>2件 ✅</strong><br>・相続セミナー資料作成：作成完了 ✅</p>
<p><strong>【今週の成果・気づき】</strong></p>
<p>今週のハイライトは伊藤様との相続プランニングです。<br>ご両親の資産状況を丁寧に整理した上で、一次相続・二次相続を見据えた総合的な提案ができ、<br>「こんなに細かく考えてもらえるとは思っていなかった」との言葉をいただきました。</p>
<p>Assetグループとして、相続・資産形成に特化した専門性を磨いていくことがチームの強みになると実感しています。<br>来月のセミナー（「知らないと損する相続対策」）の準備も順調です。</p>
<p><strong>【来週のアクション】</strong></p>
<p>・伊藤様ツーアポ（4/20）：二次相続対策プランの最終提案<br>・セミナー集客：Assetメンバーで参加者20名目標<br>・新規コンタクト：4件<br>・相続案件リストの整理</p>`,
    },
  ],
  s005: [], s006: [],
}

// ─── ダッシュボード統計 ───────────────────────────────────────────────────────
export const MOCK_DASHBOARD_STATS = {
  monthlyActivity:   38,
  monthlyContracts:  5,
  assignedCustomers: 20,
  referralsEarned:   4,
}

export const MOCK_RECENT_ACTIVITIES = [
  { id: 'a001', type: 'contract', user: '山田 一郎', target: '鈴木 太郎',  content: '生命保険を成約しました。',           createdAt: ts(-1) },
  { id: 'a002', type: 'comment',  user: '佐藤 花子', target: '田中 花子',  content: '進捗報告を追加しました。',           createdAt: ts(-1) },
  { id: 'a003', type: 'contract', user: '鈴木 二郎', target: '石田 悦子',  content: '不動産（賃貸）を成約しました。',     createdAt: ts(-2) },
  { id: 'a004', type: 'comment',  user: '田中 三郎', target: '渡辺 健一',  content: 'アポ日時を更新しました。',           createdAt: ts(-3) },
  { id: 'a005', type: 'contract', user: '西島 伸樹', target: '加藤 洋子',  content: '生命保険を成約しました。',           createdAt: ts(-5) },
]

// ─── サービス案件 ─────────────────────────────────────────────────────────────
// MOCK_SERVICE_CASES[customerId][serviceType] = CaseRaw[]
// 各案件は createdAt/updatedAt が .toDate() を持つ Timestamp-like オブジェクト

type CaseRaw = {
  id: string; status: string; date?: string; contractDate?: string
  amount?: string; company?: string; notes?: string; updatedBy?: string
  reports?: Array<{ id: string; authorName: string; content: string; statusFrom?: string; statusTo?: string; createdAt: ReturnType<typeof ts> }>
  createdAt: ReturnType<typeof ts>; updatedAt: ReturnType<typeof ts>
}

export const MOCK_SERVICE_CASES: Record<string, Record<string, CaseRaw[]>> = {
  c001: {
    lifeInsurance: [
      { id: 'sc001a', status: 'consulting', date: '2026-03-20', company: '明治安田生命', notes: '終身保険で検討中', updatedBy: '山田 一郎',
        reports: [{ id: 'r1', authorName: '山田 一郎', content: '保険の内容を説明しました。前向きに検討いただいています。', createdAt: ts(-10) }],
        createdAt: ts(-30), updatedAt: ts(-10) },
    ],
    communication: [
      { id: 'sc001b', status: 'contracted', date: '2026-02-10', contractDate: '2026-02-15', amount: '月額4,980円', company: 'ソフトバンク', updatedBy: '山田 一郎',
        createdAt: ts(-60), updatedAt: ts(-55) },
    ],
  },
  c002: {
    lifeInsurance: [
      { id: 'sc002a', status: 'considering', date: '2026-04-05', company: '住友生命', notes: '医療保険を追加検討中', updatedBy: '佐藤 花子',
        createdAt: ts(-20), updatedAt: ts(-8) },
    ],
    realEstateRental: [
      { id: 'sc002b', status: 'consulting', date: '2026-04-01', notes: '現在の家賃交渉サポート中', updatedBy: '佐藤 花子',
        createdAt: ts(-15), updatedAt: ts(-5) },
    ],
  },
  c003: {
    lifeInsurance: [
      { id: 'sc003a', status: 'contracted', date: '2026-01-15', contractDate: '2026-02-01', amount: '月額18,500円', company: '日本生命', updatedBy: '山田 一郎',
        reports: [{ id: 'r2', authorName: '山田 一郎', content: '成約。終身保険月額18,500円でご契約いただきました。', createdAt: ts(-70) }],
        createdAt: ts(-90), updatedAt: ts(-70) },
    ],
    fireInsurance: [
      { id: 'sc003b', status: 'contracted', date: '2026-02-20', contractDate: '2026-03-01', amount: '年額32,000円', company: '東京海上日動', updatedBy: '山田 一郎',
        createdAt: ts(-50), updatedAt: ts(-40) },
    ],
  },
  c007: {
    lifeInsurance: [
      { id: 'sc007a', status: 'contracted', date: '2026-01-20', contractDate: '2026-02-10', amount: '月額22,000円', company: '第一生命', updatedBy: '佐藤 花子',
        createdAt: ts(-80), updatedAt: ts(-60) },
    ],
    realEstateSale: [
      { id: 'sc007b', status: 'completed', date: '2026-02-01', contractDate: '2026-03-15', amount: '4,500万円', notes: 'マンション売却サポート完了', updatedBy: '佐藤 花子',
        createdAt: ts(-70), updatedAt: ts(-28) },
    ],
  },
  c008: {
    lifeInsurance: [
      { id: 'sc008a', status: 'contracted', date: '2025-11-10', contractDate: '2025-12-01', amount: '月額14,800円', company: '住友生命', updatedBy: '西島 伸樹',
        createdAt: ts(-150), updatedAt: ts(-120) },
    ],
    inheritance: [
      { id: 'sc008b', status: 'completed', date: '2026-01-15', contractDate: '2026-03-20', notes: '相続対策プラン策定・完了', updatedBy: '西島 伸樹',
        createdAt: ts(-90), updatedAt: ts(-24) },
    ],
  },
  c016: {
    lifeInsurance: [
      { id: 'sc016a', status: 'contracted', date: '2025-10-05', contractDate: '2025-11-01', amount: '月額16,200円', company: '明治安田生命', updatedBy: '山田 一郎',
        createdAt: ts(-180), updatedAt: ts(-160) },
    ],
    fireInsurance: [
      { id: 'sc016b', status: 'contracted', date: '2025-12-10', contractDate: '2026-01-01', amount: '年額28,000円', company: 'AIU保険', updatedBy: '山田 一郎',
        createdAt: ts(-120), updatedAt: ts(-103) },
    ],
  },
  c020: {
    lifeInsurance: [
      { id: 'sc020a', status: 'contracted', date: '2025-09-01', contractDate: '2025-10-01', amount: '月額35,000円', company: '大同生命', notes: '法人契約', updatedBy: '鈴木 二郎',
        createdAt: ts(-220), updatedAt: ts(-200) },
    ],
  },
}

// getMockServiceSummaries: 顧客IDから「サービス種別 → 最新ステータス」マップを返す
export function getMockServiceSummaries(customerId: string) {
  const byType = MOCK_SERVICE_CASES[customerId] ?? {}
  return Object.entries(byType).map(([serviceType, cases]) => {
    const latest = [...cases].sort((a, b) => b.updatedAt.seconds - a.updatedAt.seconds)[0]
    return {
      serviceType,
      latestStatus:    latest?.status ?? 'none',
      latestUpdatedAt: latest?.updatedAt ?? null,
    }
  })
}

// getMockAllCasesForType: 全顧客からサービス種別の全案件を返す
export function getMockAllCasesForType(serviceType: string) {
  const result: Array<CaseRaw & { customerId: string; customerName: string; customerNameKana: string }> = []
  for (const customer of MOCK_CUSTOMERS) {
    const cases = (MOCK_SERVICE_CASES[customer.id] ?? {})[serviceType] ?? []
    for (const c of cases) {
      result.push({ ...c, customerId: customer.id, customerName: customer.name, customerNameKana: customer.nameKana ?? '' })
    }
  }
  return result.sort((a, b) => b.updatedAt.seconds - a.updatedAt.seconds)
}

// ─── 管理：グループ ───────────────────────────────────────────────────────────
export const MOCK_ADMIN_GROUPS = [
  {
    id: 'reterace', name: 'Reterace', memberCount: 8, color: 'bg-indigo-500',
    kumiais: [
      { id: 'k001', name: '第1組合', adminName: '山田 一郎', memberCount: 12 },
      { id: 'k002', name: '第2組合', adminName: '西島 伸樹', memberCount: 9 },
    ],
  },
  {
    id: 'miraito', name: 'Miraito', memberCount: 7, color: 'bg-sky-500',
    kumiais: [
      { id: 'k003', name: '第3組合', adminName: '佐藤 花子', memberCount: 10 },
      { id: 'k004', name: '第4組合', adminName: '田中 三郎', memberCount: 8 },
    ],
  },
  {
    id: 'asset', name: 'Asset', memberCount: 6, color: 'bg-amber-500',
    kumiais: [
      { id: 'k005', name: '第5組合', adminName: '鈴木 二郎', memberCount: 11 },
    ],
  },
]
