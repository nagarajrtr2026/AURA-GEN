import Link from 'next/link'
import { Menu, Sparkles } from 'lucide-react'

const nav = [
  { href: '/', label: 'Overview' },
  { href: '/financial-form', label: 'Application' },
  { href: '/demo', label: 'Demo' },
  { href: '/developer', label: 'Developer' },
]

export function Header({ connected = false }: { connected?: boolean }) {
  return (
    <header className="sticky top-0 z-30 border-b border-[#dbe7e3]/80 bg-[#f7faf9]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-[1320px] items-center justify-between px-5 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl bg-[#1f4d46] text-white shadow-lg shadow-[#1f4d46]/20">
            <Sparkles className="size-4" />
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-[#183b37]">
            Aura<span className="text-[#4b8379]">Gen</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm text-[#66817b] transition hover:bg-[#eaf2ef] hover:text-[#214d46]"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-full border border-[#d9e9e4] bg-white px-3 py-1.5 text-xs text-[#6b8580] sm:flex">
            <span className={`size-1.5 rounded-full ${connected ? 'bg-[#3ca77b]' : 'bg-[#a9bcb7]'}`} />
            {connected ? 'Live connection' : 'Demo mode'}
          </div>

          <div className="flex size-9 items-center justify-center rounded-full border border-[#dce9e5] bg-white text-xs font-semibold text-[#42645e]">
            NM
          </div>

          <button type="button" className="md:hidden" aria-label="Open navigation">
            <Menu className="size-5 text-[#4f6d67]" />
          </button>
        </div>
      </div>
    </header>
  )
}
