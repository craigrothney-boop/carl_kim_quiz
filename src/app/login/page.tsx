import Link from "next/link";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-4 py-12">
      <h1 className="text-2xl font-semibold text-kim-navy">Log in</h1>
      <p className="mt-2 text-sm text-kim-navy/80">
        Use the username and password you chose when you registered.
      </p>
      <LoginForm />
      <p className="mt-6 text-sm text-kim-navy/80">
        New here?{" "}
        <Link href="/register" className="font-semibold text-carl-green underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
