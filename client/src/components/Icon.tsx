import { BookOpen, CircleUser, FileText, House, LayoutGrid, type LucideIcon } from 'lucide-react'
import type { TabId } from '../types'

const ICONS: Record<TabId, LucideIcon> = {
  home: House,
  documents: FileText,
  learn: BookOpen,
  gallery: LayoutGrid,
  profile: CircleUser,
}

function AppIcon({ name, active = false }: { name: TabId; active?: boolean }) {
  const Glyph = ICONS[name]
  return <Glyph size={22} strokeWidth={active ? 1.75 : 1.4} absoluteStrokeWidth aria-hidden />
}

export default AppIcon
