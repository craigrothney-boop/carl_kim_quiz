import Link from "next/link";
import { RegisterForm } from "@/components/register-form";

export default function RegisterPage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-4 py-12">
      <h1 className="text-2xl font-semibold text-kim-navy">Create an account</h1>
      <p className="mt-2 text-sm text-kim-navy/80">
        Pick a username and password. You do not need an email address. Choose
        your class so questions match what you are learning.
      </p>
      <RegisterForm />
      <p className="mt-6 text-sm text-kim-navy/80">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-carl-green underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
