import { env } from "@/lib/env";
import { supabase } from "@/lib/supabase";

export class ApiError extends Error {
  status: number;
  code: string;
  body: unknown;

  constructor(status: number, code: string, body: unknown) {
    super(code);
    this.status = status;
    this.code = code;
    this.body = body;
  }
}

async function authorizedHeaders(init?: RequestInit) {
  const headers = new Headers(init?.headers);
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return { headers, token };
}

export async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const first = await authorizedHeaders(init);
  let response = await fetch(`${env.apiUrl}${path}`, { ...init, headers: first.headers });
  if (response.status === 401 && first.token) {
    const refreshed = await supabase.auth.refreshSession();
    const next = refreshed.data.session?.access_token;
    if (next) {
      first.headers.set("Authorization", `Bearer ${next}`);
      response = await fetch(`${env.apiUrl}${path}`, { ...init, headers: first.headers });
    }
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const code =
      body && typeof body === "object" && "error" in body
        ? String((body as { error: unknown }).error)
        : "REQUEST_FAILED";
    throw new ApiError(response.status, code, body);
  }
  return body as T;
}
