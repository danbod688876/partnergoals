"use client";

import { useActionState } from "react";
import { login } from "./actions";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, undefined);

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream-50 px-5">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-serif text-3xl text-clay-800">PartnerGoals</h1>
          <p className="mt-2 text-sm text-ink-400">A quiet place to keep track of what matters.</p>
        </div>

        <form action={formAction} className="rounded-xl2 border border-ink-100 bg-white p-6 shadow-soft">
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-ink-700">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoFocus
            required
            className="w-full rounded-lg border border-ink-100 px-3 py-2 text-ink-800"
          />
          {state?.error && (
            <p className="mt-2 text-sm text-clay-600">{state.error}</p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="mt-4 w-full rounded-lg bg-clay-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-clay-600 disabled:opacity-60"
          >
            {pending ? "Checking…" : "Enter"}
          </button>
        </form>
      </div>
    </div>
  );
}
