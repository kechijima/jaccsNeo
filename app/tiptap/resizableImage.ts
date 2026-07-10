import Image from '@tiptap/extension-image'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import ResizableImageView from '~/components/tiptap/ResizableImageView.vue'

// 幅を指定できる画像拡張（クリックすると 100/250/500/750px・元のサイズ・削除を選べる）
export const ResizableImage = Image.extend({
  name: 'image',

  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element: HTMLElement) => element.style.width || element.getAttribute('width') || null,
        renderHTML: (attributes: Record<string, any>) => {
          if (!attributes.width) return {}
          return { style: `width: ${attributes.width}`, width: attributes.width }
        },
      },
      // 「元のサイズ」表示用（アップロード時の実ピクセル幅）。HTMLへは出力しない
      originalWidth: {
        default: null,
        renderHTML: () => ({}),
        parseHTML: () => null,
      },
    }
  },

  addNodeView() {
    return VueNodeViewRenderer(ResizableImageView)
  },
})
