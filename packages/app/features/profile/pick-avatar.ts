export async function pickAvatar(): Promise<{ uri: any; name: string; type: string; base64?: string } | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/png, image/jpeg, image/jpg'
    input.onchange = (e: any) => {
      const file = e.target.files?.[0]
      if (file) {
        resolve({ uri: file, name: file.name, type: file.type })
      } else {
        resolve(null)
      }
    }
    input.click()
  })
}
