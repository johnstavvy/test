import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CATEGORIES, type Category } from '../db'
import { fileToResizedDataUrl, videoFrameToResizedDataUrl } from '../lib/image'
import { recognizeReceiptText } from '../lib/ocr'
import { parseReceiptText } from '../lib/parseReceipt'
import { addExpense } from '../lib/expenses'
import { useToast } from '../lib/toast'
import { isoDate } from '../lib/week'

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

type Stage = 'idle' | 'camera' | 'scanning' | 'review' | 'saving'

type TorchCapabilities = MediaTrackCapabilities & { torch?: boolean }
type TorchConstraintSet = MediaTrackConstraintSet & { torch?: boolean }

function todayIso() {
  return isoDate(new Date())
}

export default function Capture() {
  const navigate = useNavigate()
  const toast = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const trackRef = useRef<MediaStreamTrack | null>(null)

  const [stage, setStage] = useState<Stage>('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [torchOn, setTorchOn] = useState(false)
  const [torchSupported, setTorchSupported] = useState(false)

  const [imageDataUrl, setImageDataUrl] = useState('')
  const [rawText, setRawText] = useState('')
  const [merchant, setMerchant] = useState('')
  const [date, setDate] = useState('')
  const [total, setTotal] = useState('')
  const [category, setCategory] = useState<Category>('Other')

  useEffect(() => {
    if (stage === 'camera' && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
    }
  }, [stage])

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  function closeCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    trackRef.current = null
    setTorchOn(false)
    setTorchSupported(false)
  }

  async function openCamera() {
    setError(null)
    if (!navigator.mediaDevices?.getUserMedia) {
      fileInputRef.current?.click()
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      })
      const track = stream.getVideoTracks()[0]
      const capabilities = track.getCapabilities?.() as TorchCapabilities | undefined
      if (!capabilities?.torch) {
        // This browser can't control flash from a web page (e.g. iOS Safari) — use the
        // device's native camera app instead so photos still get its own flash handling.
        stream.getTracks().forEach((t) => t.stop())
        fileInputRef.current?.click()
        return
      }
      streamRef.current = stream
      trackRef.current = track
      setTorchSupported(true)
      setTorchOn(false)
      setStage('camera')
    } catch (err) {
      console.error(err)
      // Camera permission denied or unavailable — fall back to the device's native camera app.
      fileInputRef.current?.click()
    }
  }

  function cancelCamera() {
    closeCamera()
    setStage('idle')
  }

  async function toggleTorch() {
    const track = trackRef.current
    if (!track) return
    const next = !torchOn
    try {
      await track.applyConstraints({ advanced: [{ torch: next } as TorchConstraintSet] })
      setTorchOn(next)
    } catch (err) {
      console.error(err)
    }
  }

  function capturePhoto() {
    const video = videoRef.current
    if (!video) return
    const dataUrl = videoFrameToResizedDataUrl(video)
    closeCamera()
    processImage(dataUrl)
  }

  async function processImage(resized: string) {
    setError(null)
    setStage('scanning')
    setProgress(0)
    setImageDataUrl(resized)
    try {
      const text = await recognizeReceiptText(resized, setProgress)
      setRawText(text)
      const parsed = parseReceiptText(text)
      setMerchant(parsed.merchant)
      setDate(parsed.date)
      setTotal(parsed.total.toFixed(2))
      setCategory(parsed.category)
      setStage('review')
    } catch (err) {
      console.error(err)
      setError('Could not read that receipt. You can still enter the details manually.')
      setStage('review')
    }
  }

  async function handleFile(file: File) {
    const resized = await fileToResizedDataUrl(file)
    processImage(resized)
  }

  function handleManualEntry() {
    setError(null)
    setImageDataUrl('')
    setRawText('')
    setMerchant('')
    setDate(todayIso())
    setTotal('')
    setCategory('Other')
    setStage('review')
  }

  async function handleSave() {
    // Blur whatever field is focused before we unmount this page — otherwise
    // iOS Safari can leave the viewport zoomed in on the now-gone input,
    // requiring a manual pinch to zoom back out.
    ;(document.activeElement as HTMLElement | null)?.blur()
    setStage('saving')
    const savedMerchant = merchant.trim() || 'Unknown Merchant'
    const savedTotal = parseFloat(total) || 0
    await addExpense({
      merchant: savedMerchant,
      date,
      total: savedTotal,
      category,
      rawText,
      imageDataUrl,
    })
    navigate('/expenses')
    toast.show({ message: `Saved "${savedMerchant}" — ${currency.format(savedTotal)} · ${category}` })
  }

  function reset() {
    setStage('idle')
    setImageDataUrl('')
    setRawText('')
    setMerchant('')
    setDate('')
    setTotal('')
    setCategory('Other')
    setError(null)
  }

  if (stage === 'idle') {
    return (
      <div className="flex flex-col items-center justify-center gap-6 px-6 py-16 text-center lg:mx-auto lg:max-w-xl">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-accent/10 text-4xl dark:bg-accent/15">
          🧾
        </div>
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Scan a receipt</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Take a photo or upload an image. We'll pull out the merchant, date, and total automatically.
          </p>
        </div>
        {error && (
          <p className="rounded-2xl bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
            {error}
          </p>
        )}
        <div className="flex w-full max-w-xs flex-col gap-3">
          <button
            onClick={openCamera}
            className="w-full rounded-full bg-accent px-4 py-3.5 font-semibold text-white shadow-sm transition-transform duration-150 active:scale-[0.97] active:opacity-90"
          >
            Take Photo
          </button>
          <label className="w-full cursor-pointer rounded-full border border-slate-300 px-4 py-3.5 text-center font-medium text-slate-700 transition-transform duration-150 active:scale-[0.97] active:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:active:bg-slate-800">
            Choose from Library
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </label>
          <button
            onClick={handleManualEntry}
            className="w-full rounded-full border border-slate-300 px-4 py-3.5 text-center font-medium text-slate-700 transition-transform duration-150 active:scale-[0.97] active:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:active:bg-slate-800"
          >
            Enter Manually
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
      </div>
    )
  }

  if (stage === 'camera') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-black">
        <video ref={videoRef} autoPlay playsInline muted className="min-h-0 flex-1 object-cover" />

        <div
          className="absolute inset-x-0 top-0 flex items-center justify-between p-4"
          style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' }}
        >
          <button
            onClick={cancelCamera}
            aria-label="Cancel"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-xl text-white backdrop-blur transition-transform duration-150 active:scale-90"
          >
            ✕
          </button>
          {torchSupported && (
            <button
              onClick={toggleTorch}
              aria-label={torchOn ? 'Turn flash off' : 'Turn flash on'}
              className={`flex h-10 w-10 items-center justify-center rounded-full text-xl backdrop-blur transition-all duration-150 active:scale-90 ${
                torchOn ? 'bg-amber-400 text-black' : 'bg-black/50 text-white'
              }`}
            >
              ⚡
            </button>
          )}
        </div>

        <div
          className="absolute inset-x-0 bottom-0 flex justify-center pb-8"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 2rem)' }}
        >
          <button
            onClick={capturePhoto}
            aria-label="Capture photo"
            className="h-16 w-16 rounded-full border-4 border-white bg-white/30 transition-transform duration-150 active:scale-90 active:bg-white/50"
          />
        </div>
      </div>
    )
  }

  if (stage === 'scanning') {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-6 py-24 text-center">
        {imageDataUrl && (
          <img src={imageDataUrl} alt="Receipt preview" className="h-40 w-auto rounded-2xl shadow" />
        )}
        <p className="font-medium text-slate-700 dark:text-slate-300">Reading receipt… {progress}%</p>
        <div className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          <div
            className="h-full bg-accent transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-6 lg:mx-auto lg:max-w-xl">
      <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
        {imageDataUrl ? 'Review expense' : 'New expense'}
      </h1>
      {error && (
        <p className="rounded-2xl bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">{error}</p>
      )}
      {imageDataUrl && (
        <img src={imageDataUrl} alt="Receipt" className="max-h-56 w-full rounded-2xl object-contain shadow" />
      )}

      <label className="flex flex-col gap-1 text-sm font-medium text-slate-600 dark:text-slate-300">
        Merchant
        <input
          value={merchant}
          onChange={(e) => setMerchant(e.target.value)}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 transition-shadow focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        />
      </label>

      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1 text-sm font-medium text-slate-600 dark:text-slate-300">
          Date
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 transition-shadow focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm font-medium text-slate-600 dark:text-slate-300">
          Total ($)
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            value={total}
            onChange={(e) => setTotal(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 transition-shadow focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm font-medium text-slate-600 dark:text-slate-300">
        Category
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as Category)}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 transition-shadow focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      <div className="mt-2 flex gap-3">
        <button
          onClick={reset}
          className="flex-1 rounded-full border border-slate-300 px-4 py-3.5 font-medium text-slate-700 transition-transform duration-150 active:scale-[0.97] active:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:active:bg-slate-800"
        >
          {imageDataUrl ? 'Retake' : 'Cancel'}
        </button>
        <button
          onClick={handleSave}
          disabled={stage === 'saving'}
          className="flex-1 rounded-full bg-accent px-4 py-3.5 font-semibold text-white shadow-sm transition-transform duration-150 active:scale-[0.97] active:opacity-90 disabled:opacity-60 disabled:active:scale-100"
        >
          {stage === 'saving' ? 'Saving…' : 'Save Expense'}
        </button>
      </div>
    </div>
  )
}
