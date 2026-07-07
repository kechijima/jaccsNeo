interface ToastState {
  message: string
  visible: boolean
}

// SPA全体で共有する軽量トースト（ページ遷移をまたいでも表示され続ける）
export const useToast = () => {
  const toast = useState<ToastState>('ui:toast', () => ({ message: '', visible: false }))
  const hideTimer = useState<ReturnType<typeof setTimeout> | null>('ui:toast:timer', () => null)

  const show = (message: string, durationMs = 3000) => {
    if (hideTimer.value) clearTimeout(hideTimer.value)
    toast.value = { message, visible: true }
    hideTimer.value = setTimeout(() => {
      toast.value = { ...toast.value, visible: false }
    }, durationMs)
  }

  return { toast, show }
}
