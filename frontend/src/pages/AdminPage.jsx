import AdminStats from '../components/AdminStats.jsx'
import AdminUsers from '../components/AdminUsers.jsx'

export default function AdminPage() {
  return (
    <div className="max-w-4xl space-y-8">
      <h1 className="text-2xl font-bold">Dashboard admin</h1>
      <AdminStats />
      <AdminUsers />
    </div>
  )
}