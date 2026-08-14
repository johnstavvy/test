import { createWorker } from 'tesseract.js'

export async function recognizeReceiptText(
  imageDataUrl: string,
  onProgress?: (percent: number) => void,
): Promise<string> {
  const worker = await createWorker('eng', undefined, {
    logger: (m) => {
      if (m.status === 'recognizing text') onProgress?.(Math.round(m.progress * 100))
    },
  })
  try {
    const { data } = await worker.recognize(imageDataUrl)
    return data.text
  } finally {
    await worker.terminate()
  }
}
