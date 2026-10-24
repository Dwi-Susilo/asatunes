export default function App() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-zinc-950 text-zinc-100">
      <h1 className="text-4xl font-bold text-emerald-400">ASATunes</h1>
      <p className="text-zinc-400">
        Frontend siap. API: <code>{import.meta.env.VITE_API_URL}</code>
      </p>
    </div>
  )
}