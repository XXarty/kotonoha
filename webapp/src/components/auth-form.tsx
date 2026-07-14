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

function authErrorMessage(error: unknown, mode: Mode): string {
  const friendly = getAuthErrorMessage(error);
  if (friendly !== "操作失败，请稍后重试") return `${friendly}。请检查后重试。`;
  return mode === "sign-in"
    ? "暂时无法登录，请检查网络后重试。"
    : "暂时无法注册，请检查网络后重试。";
}

export function AuthForm({ redirectTo = "/profile" }: { redirectTo?: string }) {
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
        setFormError(authErrorMessage(response.error, mode));
        return;
      }

      router.replace(redirectTo);
      router.refresh();
    } catch (error) {
      setFormError(authErrorMessage(error, mode));
    } finally {
      setIsPending(false);
    }
  }

  return (
    <section className="auth-panel paper-panel">
      <fieldset className="auth-mode-switch">
        <legend className="sr-only">账号操作</legend>
        <button
          type="button"
          aria-label="登录模式"
          aria-pressed={mode === "sign-in"}
          className="auth-mode-button"
          onClick={() => setMode("sign-in")}
        >
          登录
        </button>
        <button
          type="button"
          aria-pressed={mode === "sign-up"}
          className="auth-mode-button"
          onClick={() => setMode("sign-up")}
        >
          注册
        </button>
      </fieldset>

      <form className="auth-form" noValidate onSubmit={handleSubmit}>
        <div className="auth-field">
          <label htmlFor="auth-email">
            邮箱
          </label>
          <input
            className="auth-input"
            id="auth-email"
            name="email"
            type="email"
            autoComplete="email"
            aria-describedby={fieldErrors.email ? "auth-email-error" : undefined}
            aria-invalid={fieldErrors.email ? true : undefined}
          />
          {fieldErrors.email ? (
            <p className="auth-field-error" id="auth-email-error">
              {fieldErrors.email}
            </p>
          ) : null}
        </div>

        <div className="auth-field">
          <label htmlFor="auth-password">
            密码
          </label>
          <input
            className="auth-input"
            id="auth-password"
            name="password"
            type="password"
            minLength={8}
            autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
            aria-describedby={fieldErrors.password ? "auth-password-error" : undefined}
            aria-invalid={fieldErrors.password ? true : undefined}
          />
          {fieldErrors.password ? (
            <p className="auth-field-error" id="auth-password-error">
              {fieldErrors.password}
            </p>
          ) : null}
        </div>

        {formError ? (
          <p className="auth-form-error" role="alert">
            {formError}
          </p>
        ) : null}

        <button
          className="button-primary auth-submit"
          disabled={isPending}
          type="submit"
        >
          {isPending ? "请稍候…" : mode === "sign-in" ? "登录" : "创建账号"}
        </button>
      </form>
    </section>
  );
}
