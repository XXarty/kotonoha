import { beforeEach, describe, expect, it, vi } from "vitest";

const { headersMock } = vi.hoisted(() => ({
  headersMock: vi.fn(async () =>
    new Headers({ cookie: "better-auth.session_token=test" }),
  ),
}));

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

vi.mock("./server", () => ({
  getAuth: vi.fn(),
}));

import { getAuth } from "./server";
import { requireUser, UnauthorizedError } from "./require-user";

const getSession = vi.fn();
const mockedGetAuth = vi.mocked(getAuth);

describe("requireUser", () => {
  beforeEach(() => {
    headersMock.mockReset();
    headersMock.mockResolvedValue(
      new Headers({ cookie: "better-auth.session_token=test" }),
    );
    getSession.mockReset();
    mockedGetAuth.mockClear();
    mockedGetAuth.mockReturnValue(
      { api: { getSession } } as unknown as ReturnType<typeof getAuth>,
    );
  });

  it("waits for the dynamic request headers before initializing authentication", async () => {
    const dynamicError = new Error("DYNAMIC_SERVER_USAGE");
    headersMock.mockRejectedValueOnce(dynamicError);

    await expect(requireUser()).rejects.toBe(dynamicError);
    expect(mockedGetAuth).not.toHaveBeenCalled();
  });

  it("rejects a request without an authenticated user", async () => {
    getSession.mockResolvedValue(null);

    await expect(requireUser()).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("returns the exact authenticated Better Auth user ID", async () => {
    getSession.mockResolvedValue({
      session: { id: "session-1" },
      user: { id: "better-auth-user-42" },
    });

    await expect(requireUser()).resolves.toBe("better-auth-user-42");
    expect(getSession).toHaveBeenCalledWith({ headers: expect.any(Headers) });
  });
});
