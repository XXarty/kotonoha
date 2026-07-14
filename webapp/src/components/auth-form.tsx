"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { authClient } from "@/lib/auth/client";
import {
  authCredentialsSchema,
  getAuthErrorMessage,
  type AuthCredentials,
} from "@/lib/auth/form";

type Mode = "sign-in" | "sign-up";
type FieldErrors = Partial<Record<keyof AuthCredentials, string>>;

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});
    setFormError("");

    const formData = new FormData(event.currentTarget);
    const result = authCredentialsSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    if (!result.success) {
      const errors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0];
        if ((field === "email" || field === "password") && !errors[field]) {
          errors[field] = issue.message;
        }
      }
      setFieldErrors(errors);
      return;
    }

    setIsPending(true);

    try {
      const response =
        mode === "sign-in"
          ? await authClient.signIn.email(result.data)
          : await authClient.signUp.email({
              ...result.data,
              name: result.data.email.split("@")[0] || "Kotonoha learner",
            });

      if (response.error) {
        setFormError(getAuthErrorMessage(response.error));
        return;
      }

      router.replace("/profile");
      router.refresh();
    } catch (error) {
      setFormError(getAuthErrorMessage(error));
    } finally {
      setIsPending(false);
    }
  }

  return (
    <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-sm">
      <div className="mb-8 grid grid-cols-2 rounded-full bg-slate-100 p-1" aria-label="账号操作">
        <button
          type="button"
          aria-label="登录模式"
          aria-pressed={mode === "sign-in"}
          className="rounded-full px-4 py-2 text-sm"
          onClick={() => setMode("sign-in")}
        >
          登录
        </button>
        <button
          type="button"
          aria-pressed={mode === "sign-up"}
          className="rounded-full px-4 py-2 text-sm"
          onClick={() => setMode("sign-up")}
        >
          注册
        </button>
      </div>

      <form className="space-y-5" noValidate onSubmit={handleSubmit}>
        <div>
          <label className="mb-2 block text-sm text-slate-700" htmlFor="auth-email">
            邮箱
          </label>
          <input
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-600"
            id="auth-email"
            name="email"
            type="email"
            autoComplete="email"
            aria-describedby={fieldErrors.email ? "auth-email-error" : undefined}
          />
          {fieldErrors.email ? (
            <p className="mt-2 text-sm text-red-700" id="auth-email-error">
              {fieldErrors.email}
            </p>
          ) : null}
        </div>

        <div>
          <label className="mb-2 block text-sm text-slate-700" htmlFor="auth-password">
            密码
          </label>
          <input
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-600"
            id="auth-password"
            name="password"
            type="password"
            minLength={8}
            autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
            aria-describedby={fieldErrors.password ? "auth-password-error" : undefined}
          />
          {fieldErrors.password ? (
            <p className="mt-2 text-sm text-red-700" id="auth-password-error">
              {fieldErrors.password}
            </p>
          ) : null}
        </div>

        {formError ? (
          <p className="text-sm text-red-700" role="alert">
            {formError}
          </p>
        ) : null}

        <button
          className="w-full rounded-full bg-slate-900 px-5 py-3 text-white disabled:opacity-60"
          disabled={isPending}
          type="submit"
        >
          {isPending ? "请稍候…" : mode === "sign-in" ? "登录" : "创建账号"}
        </button>
      </form>
    </section>
  );
}
