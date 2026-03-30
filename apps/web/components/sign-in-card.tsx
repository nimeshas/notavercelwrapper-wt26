"use client";

import { useTransition } from "react";

import { authClient } from "@/lib/auth-client";

type SessionShape = Awaited<ReturnType<typeof authClient.getSession>>["data"];

type SignInCardProps = {
  session: SessionShape | null;
};

const githubScopes = ["repo", "read:user", "user:email"];

export function SignInCard({ session }: SignInCardProps) {
  const [isPending, startTransition] = useTransition();

  const handleGitHubSignIn = () => {
    startTransition(async () => {
      await authClient.signIn.social({
        provider: "github",
        callbackURL: "/",
        scopes: githubScopes,
      });
    });
  };

  const handleSignOut = () => {
    startTransition(async () => {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            window.location.reload();
          },
        },
      });
    });
  };

  return (
    <section className="rounded-[2rem] border border-[var(--panel-border)] bg-[#16120f] p-8 text-stone-50 shadow-[0_28px_90px_rgba(0,0,0,0.28)] md:p-10">
      <div className="space-y-6">
        <div className="space-y-3">
          <p className="font-mono text-xs uppercase tracking-[0.26em] text-stone-400">
            Access Gate
          </p>
          <h2 className="text-3xl font-semibold tracking-[-0.05em]">
            {session ? "GitHub linked." : "Connect your GitHub account."}
          </h2>
          <p className="text-base leading-7 text-stone-300">
            {session
              ? "Your OAuth session is active and Better Auth is storing the provider account for future repo operations."
              : "This flow stores the GitHub provider account and encrypted OAuth tokens in CockroachDB through Drizzle."}
          </p>
        </div>

        <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-stone-400">
            Requested permissions
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {githubScopes.map((scope) => (
              <span
                key={scope}
                className="rounded-full border border-white/12 bg-white/8 px-3 py-1.5 font-mono text-xs text-stone-200"
              >
                {scope}
              </span>
            ))}
          </div>
        </div>

        {session ? (
          <div className="space-y-4">
            <div className="rounded-[1.5rem] border border-emerald-400/20 bg-emerald-400/10 p-5">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-emerald-200">
                Signed in
              </p>
              <p className="mt-3 text-xl font-medium text-white">
                {session.user.name}
              </p>
              <p className="mt-1 text-sm text-stone-300">{session.user.email}</p>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={isPending}
              className="inline-flex w-full items-center justify-center rounded-full border border-white/12 px-5 py-3 text-sm font-medium text-white hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Updating session..." : "Sign out"}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleGitHubSignIn}
            disabled={isPending}
            className="inline-flex w-full items-center justify-center gap-3 rounded-full bg-[var(--accent)] px-5 py-4 text-sm font-semibold text-white hover:-translate-y-0.5 hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="font-mono text-base">{"</>"}</span>
            {isPending ? "Redirecting to GitHub..." : "Continue with GitHub"}
          </button>
        )}

        <p className="font-mono text-xs leading-6 text-stone-500">
          GitHub will show the exact requested scopes during consent. For private
          repository access, repo is the required OAuth App scope according to
          GitHub’s OAuth scope documentation.
        </p>
      </div>
    </section>
  );
}
