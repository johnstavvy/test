/** Downscale an image file to keep OCR fast and IndexedDB storage small. */
export function fileToResizedDataUrl(file: File, maxDimension = 1600): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error)
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Failed to load image'))
      img.onload = () => {
        const scale = Math.min(1, maxDimension / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('Canvas not supported'))
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.85))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}

export interface CropRect {
  x: number // fraction of image width, 0-1
  y: number
  w: number
  h: number
}

/** Crop a data URL to the given fractional rect (relative to the image's natural size). */
export function cropDataUrl(dataUrl: string, rect: CropRect): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onerror = () => reject(new Error('Failed to load image'))
    img.onload = () => {
      const sx = Math.round(rect.x * img.naturalWidth)
      const sy = Math.round(rect.y * img.naturalHeight)
      const sw = Math.round(rect.w * img.naturalWidth)
      const sh = Math.round(rect.h * img.naturalHeight)
      const canvas = document.createElement('canvas')
      canvas.width = sw
      canvas.height = sh
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('Canvas not supported'))
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh)
      resolve(canvas.toDataURL('image/jpeg', 0.9))
    }
    img.src = dataUrl
  })
}

/** Capture the current frame of a live video stream as a downscaled JPEG data URL. */
export function videoFrameToResizedDataUrl(video: HTMLVideoElement, maxDimension = 1600): string {
  const scale = Math.min(1, maxDimension / Math.max(video.videoWidth, video.videoHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(video.videoWidth * scale)
  canvas.height = Math.round(video.videoHeight * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas not supported')
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', 0.85)
}
