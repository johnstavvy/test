import { IconChart, IconHome, IconList, IconSettings, IconWallet } from './icons'

export const NAV_ITEMS = [
  { to: '/', label: 'Home', icon: IconHome, end: true },
  { to: '/expenses', label: 'Expenses', icon: IconList, end: false },
  { to: '/summary', label: 'Summary', icon: IconChart, end: false },
  { to: '/budget', label: 'Budget', icon: IconWallet, end: false },
  { to: '/settings', label: 'Settings', icon: IconSettings, end: false },
] as const

export function activeNavItem(pathname: string) {
  return NAV_ITEMS.find((item) => (item.end ? pathname === item.to : pathname.startsWith(item.to))) ?? NAV_ITEMS[0]
}
