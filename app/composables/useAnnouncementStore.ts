import {
  collection, doc, getDocs, addDoc, updateDoc, deleteDoc,
  serverTimestamp, type DocumentData,
} from 'firebase/firestore'
import type { Announcement, AnnouncementInput } from '~/types/announcement'
import type { GroupId } from '~/types/user'

const COLLECTION = 'announcements'

const toDate = (val: any): Date => val?.toDate?.() ?? (val instanceof Date ? val : new Date())

const toAnnouncement = (id: string, data: DocumentData): Announcement => ({
  id,
  ...data,
  publishedAt: toDate(data.publishedAt),
  createdAt:   toDate(data.createdAt),
  updatedAt:   toDate(data.updatedAt),
}) as Announcement

// お知らせをFirestoreで管理するストア（管理者が作成し、全ユーザーに共有される）
export const useAnnouncementStore = () => {
  const { $db } = useNuxtApp()

  const announcements = useState<Announcement[]>('announcements:list', () => [])
  const loaded  = useState<boolean>('announcements:loaded', () => false)
  const loading = useState<boolean>('announcements:loading', () => false)

  const fetchAll = async (force = false) => {
    if (loaded.value && !force) return
    loading.value = true
    try {
      const snap = await getDocs(collection($db, COLLECTION))
      announcements.value = snap.docs.map(d => toAnnouncement(d.id, d.data()))
      loaded.value = true
    } finally {
      loading.value = false
    }
  }

  // 公開範囲が「全体」または指定グループに一致する、公開済みのお知らせを新着順で返す
  const getForGroup = (groupId: Ref<GroupId | undefined> | GroupId | undefined) =>
    computed(() => {
      const gid = unref(groupId)
      return announcements.value
        .filter(a => a.isPublished && (a.scope === 'all' || a.scope === gid))
        .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
    })

  const create = async (input: AnnouncementInput): Promise<string> => {
    const ref = await addDoc(collection($db, COLLECTION), {
      ...input,
      publishedAt: input.publishedAt ?? new Date(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    await fetchAll(true)
    return ref.id
  }

  const update = async (id: string, patch: Partial<AnnouncementInput>): Promise<void> => {
    await updateDoc(doc($db, COLLECTION, id), { ...patch, updatedAt: serverTimestamp() })
    const idx = announcements.value.findIndex(a => a.id === id)
    if (idx >= 0) announcements.value[idx] = { ...announcements.value[idx], ...patch, updatedAt: new Date() }
  }

  const remove = async (id: string): Promise<void> => {
    await deleteDoc(doc($db, COLLECTION, id))
    announcements.value = announcements.value.filter(a => a.id !== id)
  }

  const togglePublish = async (id: string): Promise<void> => {
    const a = announcements.value.find(a => a.id === id)
    if (!a) return
    await update(id, { isPublished: !a.isPublished })
  }

  return { announcements, loading, loaded, fetchAll, getForGroup, create, update, remove, togglePublish }
}
