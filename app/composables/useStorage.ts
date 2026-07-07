import { ref, getDownloadURL, uploadBytesResumable } from 'firebase/storage'
import { useNuxtApp } from '#app'

// アップロードが応答なく固まり続けないよう、一定時間で打ち切る
const UPLOAD_TIMEOUT_MS = 30000

export const useStorage = () => {
  const { $storage } = useNuxtApp()

  /**
   * ファイルをアップロードしてダウンロードURLを返す
   * @param path ストレージ内のパス (例: 'customers/c001/services/li/cases/c1/file.pdf')
   * @param file Fileオブジェクト
   */
  const uploadFile = (path: string, file: File): Promise<string> => {
    const storageRef = ref($storage, path)
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

  return {
    uploadFile,
  }
}
