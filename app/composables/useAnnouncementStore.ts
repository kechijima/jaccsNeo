import { MOCK_ANNOUNCEMENTS } from '~/data/mock'
import type { Announcement, AnnouncementInput, AnnouncementScope } from '~/types/announcement'
import type { GroupId } from '~/types/user'

export const useAnnouncementStore = () => {
  const announcements = useState<Announcement[]>('announcements:list', () => [...MOCK_ANNOUNCEMENTS] as unknown as Announcement[])

  // 公開範囲が「全体」または指定グループに一致する、公開済みのお知らせを新着順で返す
  const getForGroup = (groupId: Ref<GroupId | undefined> | GroupId | undefined) =>
    computed(() => {
      const gid = unref(groupId)
      return announcements.value
        .filter(a => a.isPublished && (a.scope === 'all' || a.scope === gid))
        .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
    })

  const create = (input: AnnouncementInput): string => {
    const id = `an-local-${Date.now()}`
    const now = new Date()
    announcements.value.unshift({ id, ...input, createdAt: now, updatedAt: now })
    return id
  }

  const update = (id: string, patch: Partial<AnnouncementInput>): void => {
    const idx = announcements.value.findIndex(a => a.id === id)
    if (idx < 0) return
    announcements.value[idx] = { ...announcements.value[idx], ...patch, updatedAt: new Date() }
  }

  const remove = (id: string): void => {
    announcements.value = announcements.value.filter(a => a.id !== id)
  }

  const togglePublish = (id: string): void => {
    const a = announcements.value.find(a => a.id === id)
    if (a) a.isPublished = !a.isPublished
  }

  return { announcements, getForGroup, create, update, remove, togglePublish }
}
