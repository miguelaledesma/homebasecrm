import { requireAdmin } from "@/lib/rbac"

export default async function AdminPage() {
  await requireAdmin()

  return (
    <div>
      <h1 className="text-3xl font-bold">Admin</h1>
      <p className="text-muted-foreground mt-2">Admin dashboard coming in later phases</p>
    </div>
  )
}

