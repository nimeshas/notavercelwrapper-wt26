import { headers } from "next/headers";

import { SignInCard } from "@/components/sign-in-card";
import { auth } from "@/lib/auth";

export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return (
    <main className="relative flex min-h-screen items-center overflow-hidden px-6 py-14 sm:px-10">
      <div className="absolute inset-0 opacity-60">
        <div className="absolute left-[8%] top-[14%] h-56 w-56 rounded-full bg-[rgba(31,111,235,0.14)] blur-3xl" />
        <div className="absolute bottom-[10%] right-[10%] h-72 w-72 rounded-full bg-[rgba(255,149,0,0.16)] blur-3xl" />
      </div>
      <div className="relative mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="flex flex-col justify-between rounded-[2rem] border border-[var(--panel-border)] bg-[var(--panel)] p-8 shadow-[0_24px_80px_rgba(49,33,12,0.10)] backdrop-blur md:p-12">
          <div className="space-y-8">
            <div className="inline-flex w-fit items-center gap-3 rounded-full border border-[rgba(31,111,235,0.18)] bg-white/70 px-4 py-2 font-mono text-xs uppercase tracking-[0.28em] text-[var(--accent-strong)]">
              GitHub OAuth
            </div>
            <div className="space-y-4">
              <p className="max-w-xl font-mono text-sm uppercase tracking-[0.22em] text-[var(--muted)]">
                Launch repos into warm workers without passing PATs around.
              </p>
              <h1 className="max-w-2xl text-5xl font-semibold tracking-[-0.06em] text-[var(--foreground)] sm:text-6xl">
                Sign in once.
                <br />
                Hand Clircel repo access safely.
              </h1>
              <p className="max-w-xl text-lg leading-8 text-[var(--muted)]">
                GitHub OAuth powers the control plane login. We request repository
                access so the platform can inspect, clone, and launch your repos on
                demand.
              </p>
            </div>
          </div>
          <div className="grid gap-4 pt-10 sm:grid-cols-3">
            <div className="rounded-[1.5rem] border border-[var(--panel-border)] bg-white/75 p-5">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                Scope
              </p>
              <p className="mt-3 font-mono text-lg font-medium text-[var(--foreground)]">
                repo
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-[var(--panel-border)] bg-white/75 p-5">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                Backend
              </p>
              <p className="mt-3 text-lg font-medium text-[var(--foreground)]">
                Better Auth + Drizzle
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-[var(--panel-border)] bg-white/75 p-5">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                Database
              </p>
              <p className="mt-3 text-lg font-medium text-[var(--foreground)]">
                CockroachDB
              </p>
            </div>
          </div>
        </section>
        <SignInCard session={session} />
      </div>
    </main>
  );
}
