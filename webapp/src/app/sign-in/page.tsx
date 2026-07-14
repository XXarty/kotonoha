import Link from "next/link";

import { AuthForm } from "@/components/auth-form";
import { getSafeRedirectTarget } from "@/lib/auth/redirect";

type SignInPageProps = {
  searchParams: Promise<{ next?: string | string[] }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const { next } = await searchParams;
  const redirectTo = getSafeRedirectTarget(next);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <Link className="mb-5 text-sm tracking-[0.18em] text-slate-600" href="/">
        ことのは / KOTONOHA
      </Link>
      <h1 className="mb-8 text-3xl text-slate-900">账号登录</h1>
      <AuthForm redirectTo={redirectTo} />
    </main>
  );
}
