// ユーザー情報CSVインポート用の列定義・変換ヘルパー。
// types/customer.ts の CSV_FIELD_MAP（外部kintoneファイルの見出しと突合する）とは
// 完全に別物。こちらはこのアプリ自身が定義する、ユーザー向けの日本語ヘッダー。
import type { UserRole } from '~/types/user'

export interface UserCsvColumn {
  header: string
  key: string
  // account: 新規作成時にcreateAuthUser（Cloud Function）へ渡す項目
  // profile: updateUserProfile（Firestore直接更新）で保存するマイページ項目
  group: 'account' | 'profile'
}

export const USER_CSV_COLUMNS: UserCsvColumn[] = [
  { header: 'メールアドレス',       key: 'email',               group: 'account' },
  { header: '姓',                   key: 'lastName',            group: 'account' },
  { header: '名',                   key: 'firstName',           group: 'account' },
  { header: '姓（よみがな）',       key: 'lastNameKana',        group: 'profile' },
  { header: '名（よみがな）',       key: 'firstNameKana',       group: 'profile' },
  { header: '初期パスワード',       key: 'password',            group: 'account' },
  { header: 'ロール',               key: 'role',                group: 'account' },
  { header: '専門チーム',           key: 'specialTeams',        group: 'account' },
  { header: '所属グループ',         key: 'groupId',             group: 'account' },
  { header: '所属組合',             key: 'kumiaiId',            group: 'account' },
  { header: 'タイトル',             key: 'position',            group: 'account' },
  { header: '未来設計ID',           key: 'employeeId',          group: 'profile' },
  { header: '携帯電話',             key: 'mobile',              group: 'profile' },
  { header: '誕生日',               key: 'birthday',            group: 'profile' },
  { header: '組合加入年月',         key: 'kumiaiJoinDate',      group: 'profile' },
  { header: '地元エリア',           key: 'localArea',           group: 'profile' },
  { header: 'SNS・HP URL',          key: 'snsUrl',              group: 'profile' },
  { header: '趣味・特技',           key: 'hobbies',             group: 'profile' },
  { header: '自己紹介',             key: 'selfIntro',           group: 'profile' },
  { header: 'ビジネス内容',         key: 'businessContent',     group: 'profile' },
  { header: 'サラリーの内容',       key: 'salaryContent',       group: 'profile' },
  { header: 'りそな口座',           key: 'resonaAccount',       group: 'profile' },
  { header: 'SBI口座',              key: 'sbiAccount',          group: 'profile' },
  { header: '上記以外の銀行名',     key: 'otherBankName',       group: 'profile' },
  { header: '支店名',               key: 'otherBankBranch',     group: 'profile' },
  { header: '口座番号',             key: 'otherBankAccount',    group: 'profile' },
  { header: 'ゆうちょ加入情報',     key: 'yuuchoInfo',          group: 'profile' },
  { header: '法人名',               key: 'corporateName',       group: 'profile' },
  { header: '法人口座（メイン）',   key: 'corporateAccount',    group: 'profile' },
  { header: '法人SBI口座',          key: 'corporateSbiAccount', group: 'profile' },
  { header: 'インボイス番号',       key: 'invoiceNumber',       group: 'profile' },
  { header: '夢・目標',             key: 'dreamGoal',           group: 'profile' },
]

export const ROLE_LABEL_TO_VALUE: Record<string, UserRole> = {
  '一般':           'general',
  'EM2以上':        'em2_above',
  '理事会メンバー': 'board',
  'システム管理者': 'system_admin',
}

export const ROLE_VALUE_TO_LABEL: Record<UserRole, string> = {
  general:       '一般',
  em2_above:     'EM2以上',
  board:         '理事会メンバー',
  system_admin:  'システム管理者',
}

// 読点・カンマ区切りの複数値（専門チーム名等）を配列に分解する
export const splitUserMultiValue = (raw: string): string[] =>
  raw.split(/[、,]/).map(s => s.trim()).filter(Boolean)

// 入力用のCSVテンプレート（ヘッダー行＋記入例1行）をCSV文字列として返す
export function buildUserCsvTemplate(): string {
  const header = USER_CSV_COLUMNS.map(c => `"${c.header}"`).join(',')
  const sample: Record<string, string> = {
    email: 'example@jaccs.co.jp',
    lastName: '西島',
    firstName: '伸樹',
    lastNameKana: 'ニシジマ',
    firstNameKana: 'ノブキ',
    password: '',
    role: '一般',
    specialTeams: '',
    groupId: '',
    kumiaiId: '',
    position: '',
    birthday: '1990-01-01',
    kumiaiJoinDate: '2020-04',
  }
  const row = USER_CSV_COLUMNS.map(c => `"${(sample[c.key] ?? '').replace(/"/g, '""')}"`).join(',')
  return [header, row].join('\r\n')
}
