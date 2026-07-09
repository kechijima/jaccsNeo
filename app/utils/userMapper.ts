import type { AppUser } from '~/types/user'

// FirestoreのusersドキュメントをAppUserへ変換する共通処理
// （useAuth/useUsers 双方で同じフィールド一覧を保つため、ここに一本化する）
export const toAppUser = (uid: string, data: Record<string, any>, fallbackEmail = ''): AppUser => ({
  uid,
  email:        data.email ?? fallbackEmail,
  displayName:  data.displayName ?? '',
  avatarUrl:    data.avatarUrl,
  role:         data.role ?? 'general',
  specialTeams: data.specialTeams ?? [],
  groupId:      data.groupId,
  kumiaiId:     data.kumiaiId,
  kumiaiName:   data.kumiaiName,
  position:     data.position,
  isActive:     data.isActive ?? true,

  lastName:        data.lastName,
  firstName:       data.firstName,
  lastNameKana:    data.lastNameKana,
  firstNameKana:   data.firstNameKana,
  mobile:          data.mobile,
  employeeId:      data.employeeId,
  joinDate:        data.joinDate,
  birthday:        data.birthday,
  kumiaiJoinDate:  data.kumiaiJoinDate,
  localArea:       data.localArea,
  snsUrl:          data.snsUrl,

  supportPerson: data.supportPerson,

  businessContent: data.businessContent,
  salaryContent:   data.salaryContent,
  hometownArea:    data.hometownArea,
  currentArea:     data.currentArea,
  hobbies:         data.hobbies,

  resonaAccount:    data.resonaAccount,
  sbiAccount:       data.sbiAccount,
  otherBankName:    data.otherBankName,
  otherBankBranch:  data.otherBankBranch,
  otherBankAccount: data.otherBankAccount,
  yuuchoInfo:       data.yuuchoInfo,

  corporateName:       data.corporateName,
  corporateAccount:    data.corporateAccount,
  corporateSbiAccount: data.corporateSbiAccount,
  invoiceNumber:       data.invoiceNumber,

  selfIntro: data.selfIntro,
  dreamGoal: data.dreamGoal,

  createdAt: data.createdAt?.toDate?.() ?? new Date(),
  updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
})
