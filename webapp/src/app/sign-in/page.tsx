import Link from "next/link";

import { AuthForm } from "@/components/auth-form";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <Link className="mb-8 text-sm tracking-[0.18em] text-slate-600" href="/">
        ことのは / KOTONOHA
      </Link>
      <AuthForm />
    </main>
  );
}
