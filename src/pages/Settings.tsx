import { useEffect, useRef, useState } from 'react'
import { useTheme } from '../lib/theme'
import { useNavOrder } from '../lib/navOrder'
import { downloadBackup, exportData, parseBackupFile, restoreBackup } from '../lib/backup'
import { useCustomRules } from '../lib/customCategories'
import { useConfirm } from '../lib/confirm'
import { useToast } from '../lib/toast'
import { useSwipeToDelete } from '../lib/useSwipeToDelete'
import { clearTrash, listTrash, removeFromTrash, restoreFromTrash } from '../lib/trash'
import { CATEGORIES, type Bill, type Category, type Expense, type Income, type TrashEntry } from '../db'

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

function timeAgo(ms: number): string {
  const diff = Date.now() - ms
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function describeTrashEntry(entry: TrashEntry): { title: string; amount: string } {
  if (entry.type === 'expense') {
    const e = entry.data as Expense
    return { title: e.merchant, amount: currency.format(e.total) }
  }
  if (entry.type === 'bill') {
    const b = entry.data as Bill
    return { title: b.name, amount: `${currency.format(b.amount)}/mo` }
  }
  const i = entry.data as Income
  return { title: i.source, amount: `${currency.format(i.amount)}/mo` }
}

function TrashRow({
  entry,
  onRestore,
  onDeleteForever,
}: {
  entry: TrashEntry
  onRestore: (entry: TrashEntry) => void
  onDeleteForever: (entry: TrashEntry) => void
}) {
  const swipe = useSwipeToDelete(184)
  const { title, amount } = describeTrashEntry(entry)
  const kindLabel = entry.type === 'expense' ? 'Expense' : entry.type === 'bill' ? 'Bill' : 'Income'

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <div className="absolute inset-y-1.5 right-1.5 flex gap-1.5">
        <button
          onClick={() => onRestore(entry)}
          aria-label={`Restore ${title}`}
          className="flex w-20 items-center justify-center rounded-xl bg-accent text-sm font-semibold text-white transition-opacity active:opacity-80"
        >
          Restore
        </button>
        <button
          onClick={() => onDeleteForever(entry)}
          aria-label={`Delete ${title} forever`}
          className="flex w-20 items-center justify-center rounded-xl bg-red-500 text-sm font-semibold text-white transition-opacity active:opacity-80"
        >
          Delete
        </button>
      </div>
      <div
        {...swipe.handlers}
        style={{
          transform: `translateX(${swipe.offset}px)`,
          transition: swipe.isDragging ? 'none' : 'transform 200ms ease-out',
          touchAction: 'pan-y',
        }}
        className="relative flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-800"
      >
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-900 dark:text-slate-100">{title}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {kindLabel} · Deleted {timeAgo(entry.deletedAt)}
          </p>
        </div>
        <p className="ml-3 shrink-0 font-semibold text-slate-900 dark:text-slate-100">{amount}</p>
      </div>
    </div>
  )
}

export default function Settings() {
  const { theme, toggleTheme, setTheme } = useTheme()
  const { resetOrder, setOrder } = useNavOrder()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importStatus, setImportStatus] = useState<string | null>(null)
  const { rules, add, remove, refresh: refreshRules } = useCustomRules()
  const [ruleKeyword, setRuleKeyword] = useState('')
  const [ruleCategory, setRuleCategory] = useState<Category>(CATEGORIES[0])
  const confirmDialog = useConfirm()
  const toast = useToast()
  const [trash, setTrash] = useState<TrashEntry[]>([])

  function reloadTrash() {
    listTrash().then(setTrash)
  }

  useEffect(reloadTrash, [])

  async function handleRestore(entry: TrashEntry) {
    const { title } = describeTrashEntry(entry)
    await restoreFromTrash(entry)
    reloadTrash()
    toast.show({ message: `Restored "${title}"` })
  }

  async function handleDeleteForever(entry: TrashEntry) {
    await removeFromTrash(entry.id)
    reloadTrash()
  }

  async function handleClearTrash() {
    const proceed = await confirmDialog({
      title: 'Empty trash?',
      message: `Permanently delete ${trash.length} item${trash.length === 1 ? '' : 's'}. This can't be undone.`,
      confirmLabel: 'Empty trash',
      destructive: true,
    })
    if (!proceed) return
    await clearTrash()
    reloadTrash()
  }

  async function handleExport() {
    const data = await exportData()
    downloadBackup(data)
  }

  function handleImportClick() {
    setImportStatus(null)
    fileInputRef.current?.click()
  }

  async function handleFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const text = await file.text()
      const data = parseBackupFile(text)
      const summary = `${data.expenses.length} expenses, ${data.bills.length} bills, ${data.incomes.length} income sources`
      const proceed = await confirmDialog({
        title: `Import backup from ${data.exportedAt.slice(0, 10)}?`,
        message: `This replaces everything currently on this device with ${summary}.`,
        confirmLabel: 'Replace data',
        destructive: true,
      })
      if (!proceed) return

      const previous = await exportData()
      await restoreBackup(data)
      if (data.navOrder) setOrder(data.navOrder)
      if (data.theme) setTheme(data.theme)
      refreshRules()
      setImportStatus(`Imported ${summary}.`)
      toast.show({
        message: 'Backup imported',
        actionLabel: 'Undo',
        onAction: async () => {
          await restoreBackup(previous)
          if (previous.navOrder) setOrder(previous.navOrder)
          if (previous.theme) setTheme(previous.theme)
          refreshRules()
          setImportStatus(null)
        },
      })
    } catch (err) {
      setImportStatus(err instanceof Error ? err.message : 'Import failed.')
    }
  }

  function handleAddRule() {
    if (!ruleKeyword.trim()) return
    add(ruleKeyword, ruleCategory)
    setRuleKeyword('')
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-6 lg:mx-auto lg:max-w-xl">
      <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Settings</h1>

      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div>
          <p className="font-medium text-slate-900 dark:text-slate-100">Dark mode</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Switch between light and dark appearance.
          </p>
        </div>
        <button
          role="switch"
          aria-checked={theme === 'dark'}
          onClick={toggleTheme}
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 ${
            theme === 'dark' ? 'bg-accent' : 'bg-slate-300 dark:bg-slate-600'
          }`}
        >
          <span
            className={`absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
              theme === 'dark' ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      <div className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div>
          <p className="font-medium text-slate-900 dark:text-slate-100">Menu order</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Press and drag any tab in the menu to reorder it.
          </p>
        </div>
        <button
          onClick={resetOrder}
          className="shrink-0 text-sm font-medium text-red-600 dark:text-red-400"
        >
          Reset
        </button>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div>
          <p className="font-medium text-slate-900 dark:text-slate-100">Backup &amp; restore</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            All data lives only on this device. Export a backup file periodically, or before switching phones.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExport}
            className="flex-1 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-transform duration-150 active:scale-[0.97] active:opacity-90"
          >
            Export data
          </button>
          <button
            onClick={handleImportClick}
            className="flex-1 rounded-full border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-transform duration-150 active:scale-[0.97] active:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:active:bg-slate-700"
          >
            Import data
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          onChange={handleFileChosen}
          className="hidden"
        />
        {importStatus && <p className="text-sm text-slate-500 dark:text-slate-400">{importStatus}</p>}
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div>
          <p className="font-medium text-slate-900 dark:text-slate-100">Custom category rules</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Teach the scanner a merchant name so future receipts land in the right category automatically.
          </p>
        </div>

        <div className="flex gap-2">
          <input
            value={ruleKeyword}
            onChange={(e) => setRuleKeyword(e.target.value)}
            placeholder="e.g. Joe's Diner"
            className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 transition-shadow focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
          <select
            value={ruleCategory}
            onChange={(e) => setRuleCategory(e.target.value as Category)}
            className="shrink-0 rounded-xl border border-slate-300 bg-white px-2 py-2 text-base text-slate-900 transition-shadow focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button
            onClick={handleAddRule}
            className="shrink-0 rounded-full bg-accent px-3 py-2 text-sm font-semibold text-white shadow-sm transition-transform duration-150 active:scale-95 active:opacity-90"
          >
            Add
          </button>
        </div>

        {rules.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">No custom rules yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {rules.map((r) => (
              <li
                key={r.keyword}
                className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm dark:bg-slate-700/50"
              >
                <span className="min-w-0 truncate text-slate-700 dark:text-slate-200">
                  <span className="font-medium">{r.keyword}</span> → {r.category}
                </span>
                <button
                  onClick={() => remove(r.keyword)}
                  className="shrink-0 pl-3 text-red-600 dark:text-red-400"
                  aria-label={`Remove rule for ${r.keyword}`}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-medium text-slate-900 dark:text-slate-100">Deleted items</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Swipe an item to restore it or delete it forever.
            </p>
          </div>
          {trash.length > 0 && (
            <button
              onClick={handleClearTrash}
              className="shrink-0 text-sm font-medium text-red-600 dark:text-red-400"
            >
              Delete all
            </button>
          )}
        </div>

        {trash.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">Nothing deleted recently.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {trash.map((entry) => (
              <li key={entry.id}>
                <TrashRow entry={entry} onRestore={handleRestore} onDeleteForever={handleDeleteForever} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
