export interface SelectedMedia {
  file?: File | any
  uri: string
  name: string
  type: string
  mediaType: 'image' | 'video'
}

export async function pickMedia(): Promise<SelectedMedia | null> {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') {
      resolve(null)
      return
    }

    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/png, image/jpeg, image/jpg, image/gif, image/webp, video/mp4, video/quicktime, video/webm'
    input.onchange = (e: any) => {
      const file = e.target.files?.[0]
      if (file) {
        const isVideo = file.type.startsWith('video/')
        const mediaType = isVideo ? 'video' : 'image'
        const objectUrl = URL.createObjectURL(file)
        resolve({
          file,
          uri: objectUrl,
          name: file.name,
          type: file.type,
          mediaType,
        })
      } else {
        resolve(null)
      }
    }
    input.click()
  })
}
