"use client";

import { useActionState, useMemo, useState } from "react";
import { Phone } from "lucide-react";

import {
  changePhoneAction,
  type ChangePhoneActionState,
} from "@/lib/actions/auth";
import {
  DEFAULT_PHONE_COUNTRY,
  getCountryFlagEmoji,
  getDialCode,
  PHONE_COUNTRIES,
} from "@/lib/phone-countries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

const initialState: ChangePhoneActionState = {};

// Split a stored E.164 number (e.g. "+917217217678") into the matching country
// and the local digits, preferring the longest dial-code prefix (so "+44..."
// doesn't match "+4...").
function splitPhoneNumber(phone: string | null | undefined) {
  const digits = (phone ?? "").replace(/^\D+/, "");
  let best: { iso2: string; length: number } | null = null;
  for (const country of PHONE_COUNTRIES) {
    if (
      digits.startsWith(country.dialCode) &&
      (!best || country.dialCode.length > best.length)
    ) {
      best = { iso2: country.iso2, length: country.dialCode.length };
    }
  }
  if (!best) return { iso2: DEFAULT_PHONE_COUNTRY, localNumber: digits };
  return { iso2: best.iso2, localNumber: digits.slice(best.length) };
}

export function ChangePhoneForm({
  currentPhone,
}: {
  currentPhone: string | null;
}) {
  const [state, formAction, isPending] = useActionState(
    changePhoneAction,
    initialState
  );
  const initial = useMemo(() => splitPhoneNumber(currentPhone), [currentPhone]);
  const [countryCode, setCountryCode] = useState(initial.iso2);
  const [phoneNumber, setPhoneNumber] = useState(initial.localNumber);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Current phone:{" "}
        <span className="font-semibold text-foreground">
          {currentPhone ?? "Not set"}
        </span>
      </p>

      {state.success ? (
        <p
          role="status"
          className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400"
        >
          <Phone className="h-4 w-4" />
          Phone number updated successfully.
        </p>
      ) : null}

      {state.error ? (
        <p
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {state.error}
        </p>
      ) : null}

      <div className="flex flex-col gap-2">
        <Label htmlFor="phone">New phone number</Label>
        <div className="flex items-stretch gap-2">
          <Select
            value={countryCode}
            onValueChange={(value) =>
              setCountryCode((value as string) ?? DEFAULT_PHONE_COUNTRY)
            }
          >
            <SelectTrigger
              className="w-[5.75rem] shrink-0"
              aria-label="Country code"
            >
              <span className="flex items-center gap-1.5">
                <span className="text-base leading-none">
                  {getCountryFlagEmoji(countryCode)}
                </span>
                +{getDialCode(countryCode)}
              </span>
            </SelectTrigger>
            <SelectContent align="start" alignItemWithTrigger={false}>
              <SelectGroup>
                {PHONE_COUNTRIES.map((country) => (
                  <SelectItem key={country.iso2} value={country.iso2}>
                    <span aria-hidden="true">
                      {getCountryFlagEmoji(country.iso2)}
                    </span>
                    {country.name}
                    <span className="ml-auto text-muted-foreground">
                      +{country.dialCode}
                    </span>
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Input
            id="phone"
            name="phoneNumber"
            type="tel"
            autoComplete="tel-national"
            inputMode="numeric"
            placeholder="Phone number"
            value={phoneNumber}
            onChange={(event) =>
              setPhoneNumber(
                event.target.value.replace(/[^\d]/g, "").slice(0, 15)
              )
            }
            className="flex-1"
            required
          />
        </div>
        <input
          type="hidden"
          name="phone"
          value={`+${getDialCode(countryCode)}${phoneNumber}`}
        />
        {state.fieldErrors?.phone ? (
          <p className="text-xs text-destructive">{state.fieldErrors.phone}</p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          Include the country code so we can reach you anywhere.
        </p>
      </div>

      <Button type="submit" disabled={isPending} className="mt-1 w-full sm:w-auto">
        {isPending ? "Updating…" : "Update phone number"}
      </Button>
    </form>
  );
}
