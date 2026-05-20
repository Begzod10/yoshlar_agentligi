function requireEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (!value) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return value;
}

export const config = {
  apiUrl: requireEnv("NEXT_PUBLIC_API_URL", "http://localhost:8000"),
  appName: process.env.NEXT_PUBLIC_APP_NAME ?? "Yoshlar Agentligi",
  isDev: process.env.NODE_ENV !== "production",
} as const;
