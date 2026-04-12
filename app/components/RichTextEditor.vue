<script setup lang="ts">
import { ref, onMounted, watch, onBeforeUnmount, computed } from 'vue'
import { useEditor, EditorContent, VueRenderer } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import Mention from '@tiptap/extension-mention'
import tippy from 'tippy.js'
import MentionList from '~/components/MentionList.vue'
import { useUsers } from '~/composables/useUsers'

const props = defineProps<{
  modelValue: string
  placeholder?: string
}>()

const emit = defineEmits(['update:modelValue', 'submit'])

const { fetchUsers } = useUsers()
const users = ref<any[]>([])

onMounted(async () => {
  users.value = await fetchUsers()
})

const editor = useEditor({
  content: props.modelValue,
  extensions: [
    StarterKit,
    Link.configure({
      openOnClick: false,
      HTMLAttributes: {
        class: 'text-primary-600 hover:underline cursor-pointer',
      },
    }),
    Underline,
    Mention.configure({
      HTMLAttributes: {
        class: 'mention bg-primary-50 text-primary-600 px-1 py-0.5 rounded font-medium',
      },
      suggestion: {
        items: ({ query }) => {
          return users.value
            .filter(u => u.displayName.toLowerCase().includes(query.toLowerCase()))
            .slice(0, 5)
        },
        render: () => {
          let component: VueRenderer
          let popup: any

          return {
            onStart: (props) => {
              component = new VueRenderer(MentionList, {
                props,
                editor: props.editor,
              })

              if (!props.clientRect) return

              popup = tippy('body', {
                getReferenceClientRect: props.clientRect as any,
                appendTo: () => document.body,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: 'manual',
                placement: 'bottom-start',
              })
            },
            onUpdate(props) {
              component.updateProps(props)
              if (!props.clientRect) return
              popup[0].setProps({
                getReferenceClientRect: props.clientRect as any,
              })
            },
            onKeyDown(props) {
              if (props.event.key === 'Escape') {
                popup[0].hide()
                return true
              }
              return (component.ref as any)?.onKeyDown(props)
            },
            onExit() {
              popup[0].destroy()
              component.destroy()
            },
          }
        },
      },
    }),
  ],
  editorProps: {
    attributes: {
      class: 'prose prose-sm max-w-none focus:outline-none min-h-[120px] px-3 py-2 text-sm text-gray-900',
    },
  },
  onUpdate: ({ editor }) => {
    emit('update:modelValue', editor.getHTML())
  },
})

watch(() => props.modelValue, (value) => {
  const isSame = editor.value?.getHTML() === value
  if (isSame) return
  editor.value?.commands.setContent(value, false)
})

const setLink = () => {
  const previousUrl = editor.value?.getAttributes('link').href
  const url = window.prompt('URLを入力してください:', previousUrl)
  if (url === null) return
  if (url === '') {
    editor.value?.chain().focus().extendMarkRange('link').unsetLink().run()
    return
  }
  editor.value?.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
}

onBeforeUnmount(() => {
  editor.value?.destroy()
})
</script>

<template>
  <div class="border border-gray-300 rounded-lg bg-white overflow-hidden transition-focus-within focus-within:border-primary-500 focus-within:ring-1 focus-within:ring-primary-500">
    <!-- Toolbar -->
    <div v-if="editor" class="flex items-center flex-wrap gap-1 p-1 border-b border-gray-100 bg-gray-50/50">
      <button
        type="button"
        @click="editor.chain().focus().toggleBold().run()"
        :class="{ 'bg-gray-200 text-gray-900': editor.isActive('bold') }"
        class="p-1.5 rounded hover:bg-gray-200 text-gray-500 transition-colors"
        title="太字"
      >
        <Icon name="heroicons:bold" class="h-4 w-4" />
      </button>
      <button
        type="button"
        @click="editor.chain().focus().toggleItalic().run()"
        :class="{ 'bg-gray-200 text-gray-900': editor.isActive('italic') }"
        class="p-1.5 rounded hover:bg-gray-200 text-gray-500 transition-colors"
        title="斜体"
      >
        <Icon name="heroicons:italic" class="h-4 w-4" />
      </button>
      <button
        type="button"
        @click="editor.chain().focus().toggleUnderline().run()"
        :class="{ 'bg-gray-200 text-gray-900': editor.isActive('underline') }"
        class="p-1.5 rounded hover:bg-gray-200 text-gray-500 transition-colors"
        title="下線"
      >
        <Icon name="heroicons:underline" class="h-4 w-4" />
      </button>
      <button
        type="button"
        @click="editor.chain().focus().toggleStrike().run()"
        :class="{ 'bg-gray-200 text-gray-900': editor.isActive('strike') }"
        class="p-1.5 rounded hover:bg-gray-200 text-gray-500 transition-colors"
        title="取り消し線"
      >
        <Icon name="heroicons:strikethrough" class="h-4 w-4" />
      </button>
      
      <div class="w-px h-4 bg-gray-300 mx-1"></div>

      <button
        type="button"
        @click="editor.chain().focus().toggleBulletList().run()"
        :class="{ 'bg-gray-200 text-gray-900': editor.isActive('bulletList') }"
        class="p-1.5 rounded hover:bg-gray-200 text-gray-500 transition-colors"
        title="箇条書き"
      >
        <Icon name="heroicons:list-bullet" class="h-4 w-4" />
      </button>
      <button
        type="button"
        @click="editor.chain().focus().toggleOrderedList().run()"
        :class="{ 'bg-gray-200 text-gray-900': editor.isActive('orderedList') }"
        class="p-1.5 rounded hover:bg-gray-200 text-gray-500 transition-colors"
        title="番号付きリスト"
      >
        <Icon name="heroicons:bars-3-bottom-left" class="h-4 w-4" />
      </button>

      <div class="w-px h-4 bg-gray-300 mx-1"></div>

      <button
        type="button"
        @click="setLink"
        :class="{ 'bg-gray-200 text-primary-600': editor.isActive('link') }"
        class="p-1.5 rounded hover:bg-gray-200 text-gray-500 transition-colors"
        title="リンク"
      >
        <Icon name="heroicons:link" class="h-4 w-4" />
      </button>
      <button
        type="button"
        @click="editor.chain().focus().unsetLink().run()"
        v-if="editor.isActive('link')"
        class="p-1.5 rounded hover:bg-gray-200 text-red-500 transition-colors"
        title="リンク解除"
      >
        <Icon name="heroicons:link-slash" class="h-4 w-4" />
      </button>

      <div class="w-px h-4 bg-gray-300 mx-1"></div>

      <button
        type="button"
        @click="editor.chain().focus().clearNodes().unsetAllMarks().run()"
        class="p-1.5 rounded hover:bg-gray-200 text-gray-500 transition-colors"
        title="書式クリア"
      >
        <Icon name="heroicons:no-symbol" class="h-4 w-4" />
      </button>
    </div>

    <!-- Editor Content -->
    <EditorContent :editor="editor" class="tiptap-container" />
  </div>
</template>

<style>
/* Tiptap 基本スタイル */
.tiptap-container .ProseMirror {
  outline: none;
}
.tiptap-container .ProseMirror p {
  margin-bottom: 0.5em;
}
.tiptap-container .ProseMirror ul {
  list-style-type: disc;
  padding-left: 1.5em;
  margin-bottom: 0.5em;
}
.tiptap-container .ProseMirror ol {
  list-style-type: decimal;
  padding-left: 1.5em;
  margin-bottom: 0.5em;
}
.tiptap-container .ProseMirror blockquote {
  border-left: 3px solid #e5e7eb;
  padding-left: 1em;
  color: #6b7280;
  font-style: italic;
}
.tiptap-container .ProseMirror a {
  @apply text-primary-600 underline cursor-pointer;
}
/* プレースホルダー */
.tiptap-container .ProseMirror p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  float: left;
  color: #adb5bd;
  pointer-events: none;
  height: 0;
}
</style>
