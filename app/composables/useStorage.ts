import { useNuxtApp } from '#app'

// アップロードが応答なく固まり続けないよう、一定時間で打ち切る
const UPLOAD_TIMEOUT_MS = 30000

// 画像アップロード（アバター・活動報告・掲示板等）の容量・拡張子制限。
// Storage容量の圧迫とアップロード時間を抑えるため、JPEG/PNG以外・一定サイズ超は受け付けない。
// PDF等を含む書類アップロード（保険証券の写し等）は対象外（uploadFileをそのまま使う）
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024 // 5MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png']
const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png']

const validateImageFile = (file: File): void => {
  const ext = file.name.toLowerCase().match(/\.[^.]+$/)?.[0] ?? ''
  if (!ALLOWED_IMAGE_TYPES.includes(file.type) || !ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
    throw new Error('画像はJPEGまたはPNG形式のみアップロードできます')
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error(`画像サイズは${MAX_IMAGE_SIZE_BYTES / 1024 / 1024}MB以下にしてください`)
  }
}

// ファイルアップロードを使うページはごく一部のため、firebase/storageは
// 実際に必要になった時点で初めて動的import()する（アプリ起動時の
// JS実行コストに含めない）。Storageインスタンスはモジュールスコープで
// キャッシュし、複数回呼ばれても再初期化しない
let storagePromise: Promise<typeof import('firebase/storage')> | null = null
const loadStorage = () => {
  if (!storagePromise) storagePromise = import('firebase/storage')
  return storagePromise
}

export const useStorage = () => {
  const { $firebase } = useNuxtApp()

  /**
   * ファイルをアップロードしてダウンロードURLを返す
   * @param path ストレージ内のパス (例: 'customers/c001/services/li/cases/c1/file.pdf')
   * @param file Fileオブジェクト
   */
  const uploadFile = async (path: string, file: File): Promise<string> => {
    const { getStorage, ref, uploadBytesResumable, getDownloadURL } = await loadStorage()
    const storage = getStorage($firebase)
    const storageRef = ref(storage, path)
    const uploadTask = uploadBytesResumable(storageRef, file)

    return new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => {
        uploadTask.cancel()
        reject(new Error('アップロードがタイムアウトしました。通信環境をご確認のうえ再度お試しください。'))
      }, UPLOAD_TIMEOUT_MS)

      uploadTask.on(
        'state_changed',
        null,
        (error) => {
          clearTimeout(timeout)
          reject(error)
        },
        () => {
          clearTimeout(timeout)
          // 元の実装は complete コールバックを async 関数にしており、
          // getDownloadURL が失敗すると reject が一切呼ばれず永遠にPending状態になっていた
          getDownloadURL(uploadTask.snapshot.ref)
            .then(resolve)
            .catch(reject)
        }
      )
    })
  }

  /**
   * 画像専用のアップロード（JPEG/PNG・5MB以下のみ許可）
   */
  const uploadImage = async (path: string, file: File): Promise<string> => {
    validateImageFile(file)
    return uploadFile(path, file)
  }

  return {
    uploadFile,
    uploadImage,
  }
}
