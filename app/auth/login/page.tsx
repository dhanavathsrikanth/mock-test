import { LoginForm } from "./login-form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const authError = error === "oauth_callback_failed"
    ? "Sign-in could not be completed. Please try Google sign-in again from this site."
    : error ? "Sign-in failed. Please try again." : null;
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm initialError={authError} />
      </div>
    </div>
  );
}
