"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Ban,
  Banknote,
  CalendarDays,
  ChevronDown,
  Clock,
  Hash,
  MapPin,
  Receipt,
  User,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { CancelBookingButton } from "@/components/admin/cancel-booking-button";
import { ConfirmPaymentButton } from "@/components/admin/confirm-payment-button";
import { CancelGuideBookingButton } from "@/components/profile/cancel-guide-booking-button";
import { CancelUserBookingButton } from "@/components/profile/cancel-user-booking-button";
import { cn } from "@/lib/utils";
import { Price } from "@/components/currency/price";

type BookingStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";

const statusStyles: Record<string, string> = {
  PENDING: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  CONFIRMED: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  CANCELLED: "border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400",
  COMPLETED: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-400",
};

function statusLabel(status: string) {
  if (status === "CONFIRMED") return "Confirmed";
  if (status === "CANCELLED") return "Cancelled";
  if (status === "COMPLETED") return "Completed";
  return "Pending payment";
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatBookingReference(id: string) {
  const compactId = id.replace(/[^a-zA-Z0-9]/g, "");

  if (!compactId) return "BK-0000";

  let hash = 2166136261;
  for (let index = 0; index < compactId.length; index += 1) {
    hash ^= compactId.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  const shortCode = (hash >>> 0).toString(36).toUpperCase().padStart(6, "0");
  return `BK-${shortCode}`;
}

export type BookingCardData = {
  id: string;
  tripSlug: string;
  title: string;
  location: string;
  image: string;
  dateRange: string;
  participantCount: number;
  totalPriceRupees: number;
  status: BookingStatus;
  paymentTransactionId: string | null;
  bookedAt: string;
  customer?: {
    name: string;
    username?: string | null;
    email?: string | null;
  };
  showGuideCancel?: boolean;
  showUserCancel?: boolean;
  showAdminCancel?: boolean;
  showAdminConfirm?: boolean;
  cancelledByText?: string | null;
  cancellationReason?: string | null;
};

export function BookingCard({ booking }: { booking: BookingCardData }) {
  const [open, setOpen] = useState(false);
  const bookingReference = formatBookingReference(booking.id);

  return (
    <div className="overflow-hidden rounded-[1rem] border border-border/70 bg-background/60 transition-colors hover:border-border">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="group flex w-full flex-col gap-3 text-left sm:flex-row"
      >
        <div className="relative h-32 w-full shrink-0 overflow-hidden bg-muted/60 sm:h-auto sm:w-36">
          <Image
            src={booking.image}
            alt={booking.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="144px"
          />
        </div>
        <div className="flex flex-1 flex-col justify-between gap-2 p-3">
          <div>
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-heading text-base font-semibold leading-snug text-foreground">
                {booking.title}
              </h3>
              <span
                className={cn(
                  "shrink-0 rounded-full border px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-widest",
                  statusStyles[booking.status] ?? statusStyles.PENDING
                )}
              >
                {statusLabel(booking.status)}
              </span>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {booking.customer ? (
                <span className="inline-flex items-center gap-1">
                  <User className="h-3.5 w-3.5" />
                  {booking.customer.name}
                  {booking.customer.username ? ` (@${booking.customer.username})` : ""}
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {booking.location}
              </span>
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" />
                {booking.dateRange}
              </span>
              <span className="inline-flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {booking.participantCount}{" "}
                {booking.participantCount === 1 ? "participant" : "participants"}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-border/60 pt-2">
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {formatDateTime(booking.bookedAt)}
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                open && "rotate-180"
              )}
            />
          </div>
        </div>
      </button>

      {open ? (
        <div className="border-t border-dashed border-border/70 bg-muted/10 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" />
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
              Booking receipt
            </p>
          </div>

          <dl className="grid gap-2.5 text-sm">
            <div className="flex items-start justify-between gap-4">
              <dt className="inline-flex items-center gap-1.5 text-muted-foreground">
                <Hash className="h-3.5 w-3.5" />
                Booking reference
              </dt>
              <dd className="text-right font-mono text-xs tracking-[0.12em] text-foreground">
                {bookingReference}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="inline-flex items-center gap-1.5 text-muted-foreground">
                <Banknote className="h-3.5 w-3.5" />
                Payment method
              </dt>
              <dd className="text-right text-foreground">Bank transfer</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="inline-flex items-center gap-1.5 text-muted-foreground">
                <Receipt className="h-3.5 w-3.5" />
                Transaction ID
              </dt>
              <dd className="text-right font-mono text-xs text-foreground">
                {booking.paymentTransactionId ?? "Not submitted yet"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="inline-flex items-center gap-1.5 text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5" />
                Trip dates
              </dt>
              <dd className="text-right text-foreground">{booking.dateRange}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="inline-flex items-center gap-1.5 text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                Participants
              </dt>
              <dd className="text-right text-foreground">{booking.participantCount}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="inline-flex items-center gap-1.5 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                Booked on
              </dt>
              <dd className="text-right text-foreground">{formatDateTime(booking.bookedAt)}</dd>
            </div>
            {booking.cancelledByText ? (
              <div className="flex items-center justify-between gap-4">
                <dt className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <Ban className="h-3.5 w-3.5 text-rose-500" />
                  Cancelled by
                </dt>
                <dd className="text-right text-foreground">{booking.cancelledByText}</dd>
              </div>
            ) : null}
            {booking.cancellationReason ? (
              <div className="flex items-start justify-between gap-4">
                <dt className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <Ban className="h-3.5 w-3.5 text-rose-500" />
                  Cancellation reason
                </dt>
                <dd className="max-w-[60%] text-right text-foreground">{booking.cancellationReason}</dd>
              </div>
            ) : null}
            <div className="flex items-center justify-between gap-4 border-t border-border/60 pt-2.5">
              <dt className="font-medium text-foreground">Total paid</dt>
              <dd className="font-heading text-lg font-semibold text-foreground">
                <Price amount={booking.totalPriceRupees} />
              </dd>
            </div>
          </dl>

          <div className="mt-4 flex flex-wrap justify-end gap-2">
            {booking.showGuideCancel && booking.status !== "CANCELLED" && booking.status !== "COMPLETED" ? (
              <CancelGuideBookingButton bookingId={booking.id} />
            ) : null}
            {booking.showUserCancel && booking.status !== "CANCELLED" && booking.status !== "COMPLETED" ? (
              <CancelUserBookingButton bookingId={booking.id} />
            ) : null}
            {booking.showAdminCancel && booking.status !== "CANCELLED" && booking.status !== "COMPLETED" ? (
              <CancelBookingButton bookingId={booking.id} />
            ) : null}
            {booking.showAdminConfirm && booking.status === "PENDING" ? (
              <ConfirmPaymentButton bookingId={booking.id} />
            ) : null}
            <Button
              size="sm"
              className="rounded-full"
              nativeButton={false}
              render={<Link href={`/trips/${booking.tripSlug}`} />}
            >
              Go to trip page
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
