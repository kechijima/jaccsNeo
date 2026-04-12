import { ref, getDownloadURL, uploadBytesResumable } from 'firebase/storage'
import { useNuxtApp } from '#app'

export const useStorage = () => {
  const { $storage } = useNuxtApp()

  /**
   * ファイルをアップロードしてダウンロードURLを返す
   * @param path ストレージ内のパス (例: 'customers/c001/services/li/cases/c1/file.pdf')
   * @param file Fileオブジェクト
   */
  const uploadFile = async (path: string, file: File): Promise<string> => {
    const storageRef = ref($storage, path)
    const uploadTask = uploadBytesResumable(storageRef, file)

    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        null,
        (error) => reject(error),
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref)
          resolve(downloadURL)
        }
      )
    })
  }

  return {
    uploadFile,
  }
}
