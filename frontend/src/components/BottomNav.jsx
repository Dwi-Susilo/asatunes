import { NavLink, useLocation } from 'react-router-dom'

// Menu bawah untuk ponsel (di bawah 768 px). Di layar lebar navigasi ada di sidebar.
// Bilah pemutar (PlayerBar) duduk tepat di atas menu ini.
export default function BottomNav({ items }) {
  const location = useLocation()

  return (
    <nav
      aria-label="Menu utama"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-zinc-800 bg-zinc-950 pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {items.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          end
          state={to === '/login' ? { from: location } : undefined}
          className={({ isActive }) =>
            `flex h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[11px] ${
              isActive ? 'font-medium text-accent-400' : 'text-zinc-400 hover:text-zinc-200'
            }`
          }
        >
          <Icon className="h-6 w-6" />
          <span className="max-w-full truncate">{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
