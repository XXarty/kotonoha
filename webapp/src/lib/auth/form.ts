import { z } from "zod";

export const authCredentialsSchema = z.object({
  email: z
    .string()
    .trim()
    .pipe(z.email({ error: "请输入有效的邮箱地址" })),
  password: z.string().min(8, { error: "密码至少需要 8 个字符" }),
});

export type AuthCredentials = z.infer<typeof authCredentialsSchema>;

export function getAuthErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code?: unknown }).code;

    if (code === "INVALID_EMAIL_OR_PASSWORD") {
      return "邮箱或密码不正确";
    }

    if (code === "USER_ALREADY_EXISTS" || code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL") {
      return "该邮箱已注册";
    }
  }

  return "操作失败，请稍后重试";
}
