import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { signInEmail, signUpEmail, replace, refresh } = vi.hoisted(() => ({
  signInEmail: vi.fn(),
  signUpEmail: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("@/lib/auth/client", () => ({
  authClient: {
    signIn: { email: signInEmail },
    signUp: { email: signUpEmail },
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh }),
}));

import { AuthForm } from "./auth-form";

describe("AuthForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks invalid credentials before calling Better Auth", async () => {
    render(<AuthForm />);

    fireEvent.change(screen.getByLabelText("邮箱"), { target: { value: "invalid" } });
    fireEvent.change(screen.getByLabelText("密码"), { target: { value: "short" } });
    fireEvent.click(screen.getByRole("button", { name: "登录" }));

    expect(await screen.findByText("请输入有效的邮箱地址")).toBeInTheDocument();
    expect(screen.getByText("密码至少需要 8 个字符")).toBeInTheDocument();
    expect(signInEmail).not.toHaveBeenCalled();
  });

  it("supports email registration and moves the user to the protected profile", async () => {
    signUpEmail.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    render(<AuthForm />);

    fireEvent.click(screen.getByRole("button", { name: "注册" }));
    fireEvent.change(screen.getByLabelText("邮箱"), {
      target: { value: "learner@example.com" },
    });
    fireEvent.change(screen.getByLabelText("密码"), { target: { value: "12345678" } });
    fireEvent.click(screen.getByRole("button", { name: "创建账号" }));

    await waitFor(() => {
      expect(signUpEmail).toHaveBeenCalledWith({
        email: "learner@example.com",
        password: "12345678",
        name: "learner",
      });
    });
    expect(replace).toHaveBeenCalledWith("/profile");
    expect(refresh).toHaveBeenCalled();
  });
});
