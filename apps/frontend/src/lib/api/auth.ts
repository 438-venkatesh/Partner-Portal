/**
 * Operations Portal login — uses fetch so no Bearer token is sent on the request.
 */

export interface OperationsLoginResponse {
  token: string;
  user: {
    userId: string;
    email: string;
    role: string;
  };
}

export async function loginOperationsPortal(
  email: string,
  password: string
): Promise<OperationsLoginResponse> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = (await res.json().catch(() => ({}))) as OperationsLoginResponse & {
    message?: string;
    error?: string;
  };

  if (!res.ok) {
    throw new Error(
      data.message || data.error || 'Invalid email or password'
    );
  }

  return data as OperationsLoginResponse;
}
