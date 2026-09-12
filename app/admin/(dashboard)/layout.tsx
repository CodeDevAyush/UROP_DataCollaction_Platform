import Link from "next/link";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/admin/SignOutButton";

const NAV = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/participants", label: "Participants" },
  { href: "/admin/samples", label: "Samples" },
  { href: "/admin/questions", label: "Question Bank" },
  { href: "/admin/export", label: "Export" },
  { href: "/admin/settings", label: "Settings" },
];

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let displayName = user?.email ?? "";
  if (user) {
    const service = createSupabaseServiceClient();
    const { data: profile } = await service
      .from("admin_profiles")
      .select("display_name, role")
      .eq("id", user.id)
      .maybeSingle()
      .overrideTypes<{ display_name: string | null; role: string } | null, { merge: false }>();
    if (profile?.display_name) displayName = `${profile.display_name} (${profile.role})`;
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="hidden w-56 flex-shrink-0 border-r border-slate-200 bg-white sm:block">
        <div className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">UROP Study</p>
          <p className="text-sm font-semibold text-slate-900">Researcher Console</p>
        </div>
        <nav className="mt-2 flex flex-col gap-1 px-2">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
          <p className="text-sm text-slate-600">Signed in as {displayName}</p>
          <SignOutButton />
        </header>
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
