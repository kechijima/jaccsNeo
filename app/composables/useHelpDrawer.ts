// マニュアルを別ページへの遷移ではなく、右からのスライドパネルで
// どの画面からでも開けるようにするための共有状態
export const useHelpDrawer = () => {
  const isOpen = useState<boolean>('help:drawer-open', () => false)
  const open = () => { isOpen.value = true }
  const close = () => { isOpen.value = false }
  return { isOpen, open, close }
}
