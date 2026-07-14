import Link from "next/link";

import { requireUser } from "@/lib/auth/require-user";

export default async function ProfilePage() {
  const userId = await requireUser();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-6 py-16">
      <p className="mb-3 text-sm tracking-[0.2em] text-slate-500">学习档案</p>
      <h1 className="text-4xl text-slate-900">欢迎回来</h1>
      <p className="mt-6 text-slate-600">
        你的学习进度会绑定到账号：<span className="font-mono text-slate-900">{userId}</span>
      </p>
      <Link className="mt-10 w-fit text-sm text-slate-700 underline underline-offset-4" href="/">
        返回首页
      </Link>
    </main>
  );
}
