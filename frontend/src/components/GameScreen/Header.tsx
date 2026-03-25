export default function Header() {
  return (
    <header className="fixed top-0 w-full z-50 h-12 bg-[#131313] flex justify-between items-center px-6">
      <div className="flex items-center gap-4">
        <span className="text-white font-headline italic tracking-tighter text-lg">v1.0</span>
        <div className="h-1 w-8 bg-primary animate-pulse" />
      </div>
    </header>
  )
}
