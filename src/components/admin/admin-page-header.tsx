import Link from "next/link";
import { ArrowLeft, Headset } from "lucide-react";

import { Button } from "@/components/ui/button";
import { hasPermission, type Role } from "@/lib/authz";
import { ADMIN_SECTIONS, type AdminSection } from "@/lib/admin-sections";

export async function AdminPageHeader({
  title,
  description,
  active,
  role,
}: {
  title: string;
  description: string;
  active: AdminSection;
  role?: Role;
}) {
  const visibleSections = ADMIN_SECTIONS.filter((section) =>
    hasPermission(role, section.permission),
  );

  return (
    <header className="rounded-[2rem] border border-border/80 bg-background/90 p-8 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.25)]">
      <div className="mb-6 flex items-center justify-between gap-3">
        <Link
          href="/profile"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to profile
        </Link>
        {hasPermission(role, "support.manage") ? (
          <Button
            variant="outline"
            size="sm"
            className="rounded-full border-2 border-black dark:border-white"
            nativeButton={false}
            render={<Link href="/support" />}
          >
            <Headset className="h-3.5 w-3.5" />
            Support board
          </Button>
        ) : null}
      </div>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">Admin board</p>
          <h1 className="font-heading text-3xl font-semibold tracking-wide text-foreground sm:text-4xl">{title}</h1>
          <p className="text-sm leading-7 text-muted-foreground">{description}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {visibleSections.map((section) => (
            <Button
              key={section.key}
              variant={section.key === active ? "default" : "outline"}
              size="sm"
              className="rounded-full border-2 border-black dark:border-white"
              nativeButton={false}
              render={<Link href={section.href} />}
            >
              {section.label}
            </Button>
          ))}
        </div>
      </div>
    </header>
  );
}
