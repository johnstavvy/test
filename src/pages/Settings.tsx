import { type ComponentType, useEffect, useRef, useState } from 'react'
import { useTheme } from '../lib/theme'
import { useNavOrder } from '../lib/navOrder'
import { useDragReorder } from '../lib/useDragReorder'
import { useActivePill } from '../lib/useActivePill'
import { useHeaderHeight } from '../lib/useHeaderHeight'
import { NAV_ITEMS } from '../lib/navItems'
import { SegmentedControl } from '../lib/SegmentedControl'
import { downloadBackup, exportData, parseBackupFile, restoreBackup } from '../lib/backup'
import { useCustomRules } from '../lib/customCategories'
import { useCategoryBudgets } from '../lib/categoryBudgets'
import { useCategories } from '../lib/userCategories'
import { useConfirm } from '../lib/confirm'
import { useToast } from '../lib/toast'
import { useSwipeToDelete } from '../lib/useSwipeToDelete'
import { clearTrash, listTrash, removeFromTrash, restoreFromTrash } from '../lib/trash'
import { type Bill, type Category, type Expense, type Income, type TrashEntry } from '../db'
import { IconBackup, IconClose, IconGripLines, IconSliders, IconTag, IconTrash } from '../lib/icons'

type SettingsTabKey = 'general' | 'categories' | 'backup' | 'trash'

const SETTINGS_TABS: { key: SettingsTabKey; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { key: 'general', label: 'General', icon: IconSliders },
  { key: 'categories', label: 'Categories', icon: IconTag },
  { key: 'backup', label: 'Backup', icon: IconBackup },
  { key: 'trash', label: 'Trash', icon: IconTrash },
]

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

const sectionLabelClass = 'text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400 dark:text-slate-500'
const cardClass = 'flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-[#31343a] dark:bg-[#212327]'
const rowItemClass =
  'flex items-center justify-between gap-3 rounded-none border-b border-slate-100 py-2.5 text-sm last:border-b-0 dark:border-[#1e2027]'

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

// Reordering happens here, not on the live nav bar — dragging directly on the bar
// would fight with its glass "liquid" active-tab pill, which relies on the bar
// being a plain non-interactive-for-dragging list of links.
function MenuOrderList({ order, setOrder }: { order: string[]; setOrder: (order: string[]) => void }) {
  const drag = useDragReorder(order, setOrder, 'y')
  const orderedItems = order.map((to) => NAV_ITEMS.find((item) => item.to === to)!).filter(Boolean)

  return (
    <div className="flex flex-col">
      {orderedItems.map((item) => {
        const isDragging = drag.dragState?.key === item.to
        return (
          <div
            key={item.to}
            ref={(el) => drag.registerItemRef(item.to, el)}
            onPointerDown={(e) => drag.handlePointerDown(item.to, e)}
            onContextMenu={(e) => e.preventDefault()}
            style={{
              touchAction: 'none',
              WebkitUserSelect: 'none',
              transform: isDragging ? `translateY(${drag.dragState!.offset}px)` : undefined,
              transition: isDragging ? 'none' : 'transform 200ms ease-out',
              zIndex: isDragging ? 10 : undefined,
            }}
            className={`flex select-none items-center gap-3 border-b border-slate-100 py-2.5 text-sm font-medium text-slate-700 last:border-b-0 dark:border-[#1e2027] dark:text-slate-200 ${
              isDragging ? 'scale-105 bg-white shadow-lg dark:bg-[#212327]' : ''
            }`}
          >
            <item.icon className="h-5 w-5 shrink-0 text-slate-400 dark:text-slate-500" />
            <span className="flex-1">{item.label}</span>
            <IconGripLines className="h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600" />
          </div>
        )
      })}
    </div>
  )
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
  const swipe = useSwipeToDelete(168)
  const { title, amount } = describeTrashEntry(entry)
  const kindLabel = entry.type === 'expense' ? 'Expense' : entry.type === 'bill' ? 'Bill' : 'Income'

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-y-1 right-0 flex gap-1.5">
        <button
          onClick={() => onRestore(entry)}
          aria-label={`Restore ${title}`}
          className="flex w-20 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white transition-opacity active:opacity-80"
        >
          Restore
        </button>
        <button
          onClick={() => onDeleteForever(entry)}
          aria-label={`Delete ${title} forever`}
          className="flex w-20 items-center justify-center rounded-full bg-rose-500 text-sm font-semibold text-white transition-opacity active:opacity-80"
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
        className="relative flex items-center justify-between gap-3 border-b border-slate-100 bg-white py-2.5 last:border-b-0 dark:border-[#1e2027] dark:bg-[#212327]"
      >
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-900 dark:text-slate-100">{title}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {kindLabel} · Deleted {timeAgo(entry.deletedAt)}
          </p>
        </div>
        <p className="tabular-nums ml-3 shrink-0 font-semibold text-slate-900 dark:text-slate-100">{amount}</p>
      </div>
    </div>
  )
}

// Sticky page-local tab bar, mirroring the app's main glass-pill bottom nav
// (same border/blur/shadow treatment, same active-pill glide via useActivePill)
// so switching Settings categories feels like the same nav language, just
// scoped to this page. Sticks directly beneath the app header via
// useHeaderHeight rather than a hardcoded offset, since header height varies
// with the device's safe-area inset and collapses to 0 on desktop.
function SettingsTabBar({ tab, setTab }: { tab: SettingsTabKey; setTab: (tab: SettingsTabKey) => void }) {
  const headerHeight = useHeaderHeight()
  const pill = useActivePill(tab, [])

  return (
    <div className="sticky z-10" style={{ top: headerHeight }}>
      <div
        ref={pill.containerRef}
        className="relative flex justify-around overflow-hidden rounded-full border border-slate-900/10 bg-white/92 px-1 py-1.5 shadow-lg shadow-slate-900/10 backdrop-blur-xl dark:border-white/10 dark:bg-[#1b1d20]/92 dark:shadow-black/40"
      >
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-y-1 z-0 rounded-full bg-accent/15 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
            pill.rect ? 'opacity-100' : 'opacity-0'
          }`}
          style={pill.rect ? { left: pill.rect.start, width: pill.rect.size } : undefined}
        />
        {SETTINGS_TABS.map((t) => (
          <button
            key={t.key}
            ref={pill.registerRef(t.key)}
            onClick={() => setTab(t.key)}
            className={`relative z-10 flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
              tab === t.key ? 'text-accent' : 'text-slate-400 dark:text-slate-500'
            }`}
          >
            <t.icon
              className={`h-5 w-5 transition-transform duration-200 ${tab === t.key ? 'scale-110' : 'scale-100'}`}
            />
            <span className="w-full truncate text-center">{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default function Settings() {
  const { mode, setTheme } = useTheme()
  const { order, resetOrder, setOrder } = useNavOrder()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importStatus, setImportStatus] = useState<string | null>(null)
  const { rules, add, remove, refresh: refreshRules } = useCustomRules()
  const { budgets, set: setCategoryBudget, refresh: refreshBudgets } = useCategoryBudgets()
  const {
    categories,
    userCategories,
    add: addCategory,
    remove: removeCategory,
    refresh: refreshCategories,
  } = useCategories()
  const [budgetDrafts, setBudgetDrafts] = useState<Partial<Record<Category, string>>>({})
  const [ruleKeyword, setRuleKeyword] = useState('')
  const [ruleCategory, setRuleCategory] = useState<Category>(categories[0])
  const [newCategoryName, setNewCategoryName] = useState('')
  const confirmDialog = useConfirm()
  const toast = useToast()
  const [trash, setTrash] = useState<TrashEntry[]>([])
  const [tab, setTab] = useState<SettingsTabKey>('general')

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
      refreshBudgets()
      refreshCategories()
      setImportStatus(`Imported ${summary}.`)
      toast.show({
        message: 'Backup imported',
        actionLabel: 'Undo',
        onAction: async () => {
          await restoreBackup(previous)
          if (previous.navOrder) setOrder(previous.navOrder)
          if (previous.theme) setTheme(previous.theme)
          refreshRules()
          refreshBudgets()
          refreshCategories()
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
      <h1 className="hidden text-[17px] font-semibold text-slate-900 dark:text-slate-100 lg:block">Settings</h1>

      <SettingsTabBar tab={tab} setTab={setTab} />

      {tab === 'general' && (
        <>
          <div className="flex flex-col gap-2">
            <div>
              <p className={sectionLabelClass}>Appearance</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Choose light, dark, or match your device setting.
              </p>
            </div>
            <SegmentedControl
              value={mode}
              onChange={setTheme}
              options={[
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
                { value: 'system', label: 'System' },
              ]}
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={sectionLabelClass}>Menu order</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Press and drag a tab to reorder it.</p>
              </div>
              <button onClick={resetOrder} className="shrink-0 text-sm font-medium text-rose-600 dark:text-rose-400">
                Reset
              </button>
            </div>
            <MenuOrderList order={order} setOrder={setOrder} />
          </div>
        </>
      )}

      {tab === 'backup' && (
        <div className={cardClass}>
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
              className="flex-1 rounded-full border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-transform duration-150 active:scale-[0.97] active:bg-slate-50 dark:border-[#3a3e45] dark:text-slate-200 dark:active:bg-[#2b2e33]"
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
      )}

      {tab === 'categories' && (
        <>
          <div className={cardClass}>
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
                className="min-w-0 flex-1 rounded-full border border-slate-300 bg-white px-3.5 py-2 text-base text-slate-900 transition-shadow focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 dark:border-[#3a3e45] dark:bg-[#212327] dark:text-slate-100"
              />
              <select
                value={ruleCategory}
                onChange={(e) => setRuleCategory(e.target.value as Category)}
                className="shrink-0 rounded-full border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 transition-shadow focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 dark:border-[#3a3e45] dark:bg-[#212327] dark:text-slate-100"
              >
                {categories.map((c) => (
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
              <ul className="flex flex-col">
                {rules.map((r) => (
                  <li key={r.keyword} className={rowItemClass}>
                    <span className="min-w-0 truncate text-slate-700 dark:text-slate-200">
                      <span className="font-medium">{r.keyword}</span> → {r.category}
                    </span>
                    <button
                      onClick={() => remove(r.keyword)}
                      className="shrink-0 pl-3 text-rose-600 dark:text-rose-400"
                      aria-label={`Remove rule for ${r.keyword}`}
                    >
                      <IconClose className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={cardClass}>
            <div>
              <p className="font-medium text-slate-900 dark:text-slate-100">Categories</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Add your own category — it'll show up anywhere you pick a category, including scanning a new
                expense.
              </p>
            </div>

            <div className="flex gap-2">
              <input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="e.g. Childcare"
                className="min-w-0 flex-1 rounded-full border border-slate-300 bg-white px-3.5 py-2 text-base text-slate-900 transition-shadow focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 dark:border-[#3a3e45] dark:bg-[#212327] dark:text-slate-100"
              />
              <button
                onClick={() => {
                  if (!newCategoryName.trim()) return
                  addCategory(newCategoryName)
                  setNewCategoryName('')
                }}
                className="shrink-0 rounded-full bg-accent px-3 py-2 text-sm font-semibold text-white shadow-sm transition-transform duration-150 active:scale-95 active:opacity-90"
              >
                Add
              </button>
            </div>

            {userCategories.length > 0 && (
              <ul className="flex flex-col">
                {[...userCategories]
                  .sort((a, b) => a.localeCompare(b))
                  .map((c) => (
                    <li key={c} className={rowItemClass}>
                      <span className="min-w-0 truncate font-medium text-slate-700 dark:text-slate-200">{c}</span>
                      <button
                        onClick={() => removeCategory(c)}
                        className="shrink-0 pl-3 text-rose-600 dark:text-rose-400"
                        aria-label={`Remove category ${c}`}
                      >
                        <IconClose className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
              </ul>
            )}
          </div>

          <div className={cardClass}>
            <div>
              <p className="font-medium text-slate-900 dark:text-slate-100">Category budgets</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Set a monthly cap per category to get warned in Summary. Leave blank for no cap.
              </p>
            </div>

            <ul className="flex flex-col">
              {categories.map((category) => (
                <li key={category} className={rowItemClass}>
                  <span className="text-sm text-slate-700 dark:text-slate-200">{category}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm text-slate-400 dark:text-slate-500">$</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="1"
                      min="0"
                      placeholder="No cap"
                      value={budgetDrafts[category] ?? budgets[category] ?? ''}
                      onChange={(e) => setBudgetDrafts((prev) => ({ ...prev, [category]: e.target.value }))}
                      onBlur={(e) => {
                        const value = e.target.value.trim()
                        setCategoryBudget(category, value === '' ? undefined : parseFloat(value))
                        setBudgetDrafts((prev) => {
                          const next = { ...prev }
                          delete next[category]
                          return next
                        })
                      }}
                      className="w-24 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-right text-sm text-slate-900 transition-shadow focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 dark:border-[#3a3e45] dark:bg-[#212327] dark:text-slate-100"
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      {tab === 'trash' && (
        <div className={cardClass}>
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
                className="shrink-0 text-sm font-medium text-rose-600 dark:text-rose-400"
              >
                Delete all
              </button>
            )}
          </div>

          {trash.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500">Nothing deleted recently.</p>
          ) : (
            <ul className="flex flex-col">
              {trash.map((entry) => (
                <li key={entry.id}>
                  <TrashRow entry={entry} onRestore={handleRestore} onDeleteForever={handleDeleteForever} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
