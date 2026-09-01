import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-muted/50">
      <div className="z-10 w-full max-w-md overflow-hidden rounded-2xl border bg-card shadow-xl">
        <div className="flex flex-col items-center justify-center space-y-3 border-b bg-background px-4 py-6 pt-8 text-center sm:px-16">
          <h3 className="text-xl font-semibold">FinTrack Personal</h3>
          <p className="text-sm text-muted-foreground">
            Sign in with your email and password
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
