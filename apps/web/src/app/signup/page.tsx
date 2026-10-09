import Link from "next/link";
import { signup } from "./actions";
import { Wordmark } from "@/components/brand";
import { COMPANY_PLANS, type CompanyPlan } from "@roughcut/shared";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const error = sp.error;
  const plan: CompanyPlan = (COMPANY_PLANS as readonly string[]).includes(sp.plan ?? "")
    ? (sp.plan as CompanyPlan)
    : "free";

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <Link href="/" aria-label="RoughCUT home" className="mb-8 w-fit">
        <Wordmark />
      </Link>
      <h1 className="text-3xl">Create your account.</h1>
      <p className="mt-2 text-muted">
        Plan: <span className="font-medium capitalize text-ink">{plan}</span>.{" "}
        <Link href="/pricing" className="text-accent hover:underline">
          Change plan
        </Link>
      </p>

      {error && (
        <div className="mt-4 rounded-lg border border-bad/40 bg-[#FBE9E7] p-3 text-sm text-bad">{error}</div>
      )}

      <form action={signup} className="mt-6 flex flex-col gap-4">
        <input type="hidden" name="plan" value={plan} />
        <Field label="Business name" name="companyName" placeholder="Halton Electric" required />
        <Field label="Your name" name="fullName" placeholder="Chris Halton" required />
        <Field label="Email" name="email" type="email" placeholder="you@business.com" required />
        <Field label="Password" name="password" type="password" minLength={8} required />
        <button type="submit" className="btn-primary mt-2">
          {plan === "free" ? "Create free account" : "Continue to payment"}
        </button>
      </form>

      <p className="mt-6 text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="text-accent hover:underline">
          Log in
        </Link>
      </p>
    </main>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  required,
  minLength,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-xs font-bold uppercase tracking-wide text-muted">{label}</span>
      <input
        className="input"
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
      />
    </label>
  );
}
