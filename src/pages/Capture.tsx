import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CATEGORIES, type Category } from '../db'
import { fileToResizedDataUrl } from '../lib/image'
import { recognizeReceiptText } from '../lib/ocr'
import { parseReceiptText } from '../lib/parseReceipt'
import { addExpense } from '../lib/expenses'

type Stage = 'idle' | 'scanning' | 'review' | 'saving'

export default function Capture() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [stage, setStage] = useState<Stage>('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const [imageDataUrl, setImageDataUrl] = useState('')
  const [rawText, setRawText] = useState('')
  const [merchant, setMerchant] = useState('')
  const [date, setDate] = useState('')
  const [total, setTotal] = useState('')
  const [category, setCategory] = useState<Category>('Other')

  async function handleFile(file: File) {
    setError(null)
    setStage('scanning')
    setProgress(0)
    try {
      const resized = await fileToResizedDataUrl(file)
      setImageDataUrl(resized)
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

  async function handleSave() {
    setStage('saving')
    await addExpense({
      merchant: merchant.trim() || 'Unknown Merchant',
      date,
      total: parseFloat(total) || 0,
      category,
      rawText,
      imageDataUrl,
    })
    navigate('/')
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
      <div className="flex flex-col items-center justify-center gap-6 px-6 py-16 text-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100 text-4xl">
          🧾
        </div>
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Scan a receipt</h1>
          <p className="mt-1 text-sm text-slate-500">
            Take a photo or upload an image. We'll pull out the merchant, date, and total automatically.
          </p>
        </div>
        <div className="flex w-full max-w-xs flex-col gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-medium text-white active:bg-emerald-700"
          >
            Take Photo
          </button>
          <label className="w-full cursor-pointer rounded-xl border border-slate-300 px-4 py-3 text-center font-medium text-slate-700 active:bg-slate-100">
            Choose from Library
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </label>
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

  if (stage === 'scanning') {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-6 py-24 text-center">
        {imageDataUrl && (
          <img src={imageDataUrl} alt="Receipt preview" className="h-40 w-auto rounded-lg shadow" />
        )}
        <p className="font-medium text-slate-700">Reading receipt… {progress}%</p>
        <div className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full bg-emerald-600 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-6">
      <h1 className="text-lg font-semibold text-slate-900">Review expense</h1>
      {error && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{error}</p>
      )}
      {imageDataUrl && (
        <img src={imageDataUrl} alt="Receipt" className="max-h-56 w-full rounded-lg object-contain shadow" />
      )}

      <label className="flex flex-col gap-1 text-sm font-medium text-slate-600">
        Merchant
        <input
          value={merchant}
          onChange={(e) => setMerchant(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-900"
        />
      </label>

      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1 text-sm font-medium text-slate-600">
          Date
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-900"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm font-medium text-slate-600">
          Total ($)
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            value={total}
            onChange={(e) => setTotal(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-900"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm font-medium text-slate-600">
        Category
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as Category)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-900"
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
          className="flex-1 rounded-xl border border-slate-300 px-4 py-3 font-medium text-slate-700 active:bg-slate-100"
        >
          Retake
        </button>
        <button
          onClick={handleSave}
          disabled={stage === 'saving'}
          className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 font-medium text-white active:bg-emerald-700 disabled:opacity-60"
        >
          {stage === 'saving' ? 'Saving…' : 'Save Expense'}
        </button>
      </div>
    </div>
  )
}
