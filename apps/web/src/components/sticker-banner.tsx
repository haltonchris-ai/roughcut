import Link from "next/link";
import type { StickerUsage } from "@/lib/sticker-usage";

const planName = (p: string) => p.charAt(0).toUpperCase() + p.slice(1);

// variant "alerts": only renders when running low or out (used app-wide).
// variant "status": only renders when healthy (used on Jobs / Stickers pages).
export function StickerBanner({
  usage,
  isAdmin,
  variant,
  need,
}: {
  usage: StickerUsage;
  isAdmin: boolean;
  variant: "alerts" | "status";
  need?: number; // quantity the user just tried to order
}) {
  const { level, remaining, limit, plan, unassigned, nextPlan, nextPlanLimit, nextPlanPrice } = usage;
  if (level === "unlimited") {
    if (variant !== "status") return null;
    return (
      <p className="mb-4 text-sm text-muted">
        {unassigned} unassigned sticker{unassigned === 1 ? "" : "s"} · {planName(plan)} plan, unlimited stickers
      </p>
    );
  }

  const alert = level === "low" || level === "out";
  if (variant === "alerts" && !alert) return null;
  if (variant === "status" && alert) return null;

  const upsell = nextPlan
    ? `${planName(nextPlan)} plan, $${nextPlanPrice}/mo, ${nextPlanLimit ?? "unlimited"} stickers`
    : null;

  if (!alert) {
    return (
      <p className="mb-4 text-sm text-muted">
        <span className="font-semibold text-ink">{remaining}</span> of {limit} stickers left on your {planName(plan)}{" "}
        plan · {unassigned} printed but not yet assigned
      </p>
    );
  }

  const out = level === "out";
  const tooFew = need !== undefined && remaining !== null && need > remaining;
  const headline = out
    ? `You've used all ${limit} stickers on the ${planName(plan)} plan.`
    : `Only ${remaining} of ${limit} stickers left on the ${planName(plan)} plan.`;

  return (
    <div
      className={
        "mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 text-sm " +
        (out ? "border-bad/40 bg-bad/10" : "border-warn/40 bg-warn/10")
      }
      role="status"
    >
      <div>
        <p className={"font-semibold " + (out ? "text-bad" : "text-warn")}>{headline}</p>
        <p className="mt-1 text-muted">
          {tooFew && `That order needs ${need}. `}
          {unassigned > 0
            ? `You still have ${unassigned} printed sticker${unassigned === 1 ? "" : "s"} you haven't used yet. `
            : ""}
          {isAdmin
            ? upsell
              ? `Upgrade to unlock more: ${upsell}.`
              : "Contact us to raise your limit."
            : "Ask your company admin to upgrade the plan."}
        </p>
      </div>
      {isAdmin && nextPlan && (
        <Link href="/pricing?reason=stickers" className="btn-primary whitespace-nowrap">
          Upgrade to {planName(nextPlan)}
        </Link>
      )}
    </div>
  );
}
