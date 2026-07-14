import { beforeEach, describe, expect, it, vi } from "vitest";

const getHandler = vi.fn();
const postHandler = vi.fn();
const getAuth = vi.fn();
const toNextJsHandler = vi.fn(() => ({ GET: getHandler, POST: postHandler }));

vi.mock("@/lib/auth/server", () => ({ getAuth }));
vi.mock("better-auth/next-js", () => ({ toNextJsHandler }));

describe("Better Auth route handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not initialize authentication when the route module is imported", async () => {
    await import("./route");

    expect(getAuth).not.toHaveBeenCalled();
    expect(toNextJsHandler).not.toHaveBeenCalled();
  });

  it("creates the GET handler at request time", async () => {
    const request = new Request("https://kotonoha.example/api/auth/session");
    const response = new Response(null, { status: 204 });
    const auth = { api: {} };
    getAuth.mockReturnValue(auth);
    getHandler.mockResolvedValue(response);

    const route = await import("./route");

    await expect(route.GET(request)).resolves.toBe(response);
    expect(toNextJsHandler).toHaveBeenCalledWith(auth);
    expect(getHandler).toHaveBeenCalledWith(request);
  });

  it("creates the POST handler at request time", async () => {
    const request = new Request("https://kotonoha.example/api/auth/sign-in/email", {
      method: "POST",
      body: JSON.stringify({ email: "learner@example.com", password: "12345678" }),
      headers: { "content-type": "application/json" },
    });
    const response = new Response(null, { status: 204 });
    const auth = { api: {} };
    getAuth.mockReturnValue(auth);
    postHandler.mockResolvedValue(response);

    const route = await import("./route");

    await expect(route.POST(request)).resolves.toBe(response);
    expect(toNextJsHandler).toHaveBeenCalledWith(auth);
    expect(postHandler).toHaveBeenCalledWith(request);
  });
});
