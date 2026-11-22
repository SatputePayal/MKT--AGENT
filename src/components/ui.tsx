import Link from "next/link";
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import type { Status } from "@/lib/mock-data";

export const cx = (...c: Array<string | false | null | undefined>) =>
  c.filter(Boolean).join(" ");

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cx(
        "rounded-xl border border-line bg-surface shadow-sm",
        className,
      )}
    >
      {children}
    </section>
  );
}
export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
      <div>
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-muted">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

const tones = {
  neutral: "bg-subtle text-muted",
  brand: "bg-brand-soft text-brand",
  success: "bg-ok-soft text-ok",
  warning: "bg-warn-soft text-warn",
  danger: "bg-bad-soft text-bad",
  info: "bg-info-soft text-info",
};
export type Tone = keyof typeof tones;
export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: Tone;
  children: ReactNode;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}
const statusTone: Record<Status, Tone> = {
  Active: "success",
  Paused: "warning",
  "Pending approval": "info",
  Draft: "neutral",
};
export const StatusBadge = ({ status }: { status: Status }) => (
  <Badge tone={statusTone[status]}>{status}</Badge>
);

const variants = {
  primary: "bg-brand text-white hover:bg-brand-hover",
  secondary: "border border-line bg-surface text-ink hover:bg-subtle",
  success: "bg-ok-soft text-ok hover:opacity-80",
  danger: "border border-line text-bad hover:bg-bad-soft",
};
export type Variant = keyof typeof variants;
export const buttonClass = (
  variant: Variant = "primary",
  size: "sm" | "md" = "md",
) =>
  cx(
    "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
    size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm",
    variants[variant],
  );
export function Button({
  variant,
  size,
  className,
  ...p
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: "sm" | "md";
}) {
  return (
    <button {...p} className={cx(buttonClass(variant, size), className)} />
  );
}
export function ButtonLink({
  href,
  variant,
  size,
  children,
}: {
  href: string;
  variant?: Variant;
  size?: "sm" | "md";
  children: ReactNode;
}) {
  return (
    <Link href={href} className={buttonClass(variant, size)}>
      {children}
    </Link>
  );
}

export function StatCard({
  label,
  value,
  delta,
  tone = "neutral",
}: {
  label: string;
  value: string;
  delta?: string;
  tone?: Tone;
}) {
  return (
    <Card className="p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-ink">{value}</p>
      {delta && (
        <div className="mt-2 flex items-center gap-2">
          <Badge tone={tone}>{delta}</Badge>
          <span className="text-xs text-muted">vs last week</span>
        </div>
      )}
    </Card>
  );
}
export function ProgressBar({ value }: { value: number }) {
  const v = Math.min(100, Math.max(0, value));
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-subtle"
      role="progressbar"
      aria-valuenow={Math.round(v)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cx(
          "h-full rounded-full",
          v >= 100 ? "bg-bad" : v >= 90 ? "bg-warn" : "bg-brand",
        )}
        style={{ width: `${v}%` }}
      />
    </div>
  );
}
export function BarChart({
  data,
}: {
  data: { label: string; value: number }[];
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-3">
      {data.map((d) => (
        <div key={d.label} className="flex flex-1 flex-col items-center gap-2">
          <div className="flex h-40 w-full items-end">
            <div
              title={`${d.label}: ₹${d.value.toLocaleString("en-IN")}`}
              className="w-full rounded-t-md bg-brand/80 transition-colors hover:bg-brand"
              style={{ height: `${(d.value / max) * 100}%` }}
            />
          </div>
          <span className="text-xs text-muted">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export const Table = ({ children }: { children: ReactNode }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-left text-sm">{children}</table>
  </div>
);
export const Th = ({ children }: { children?: ReactNode }) => (
  <th className="whitespace-nowrap bg-subtle px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted">
    {children}
  </th>
);
export const Td = ({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) => (
  <td
    className={cx(
      "whitespace-nowrap border-t border-line px-4 py-3 text-ink",
      className,
    )}
  >
    {children}
  </td>
);

export const inputClass =
  "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";
export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}
export const Input = (p: InputHTMLAttributes<HTMLInputElement>) => (
  <input {...p} className={cx(inputClass, p.className)} />
);
export const Select = (p: SelectHTMLAttributes<HTMLSelectElement>) => (
  <select {...p} className={cx(inputClass, p.className)} />
);
export const Textarea = (p: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea {...p} className={cx(inputClass, p.className)} />
);
