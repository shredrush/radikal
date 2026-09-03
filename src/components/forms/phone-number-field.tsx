"use client";

import { useState } from "react";

import {
  DEFAULT_PHONE_COUNTRY,
  getCountryFlagEmoji,
  getDialCode,
  PHONE_COUNTRIES,
} from "@/lib/phone-countries";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

function splitPhoneNumber(phone: string) {
  const digits = phone.replace(/^\D+/, "");
  const country = [...PHONE_COUNTRIES]
    .sort((a, b) => b.dialCode.length - a.dialCode.length)
    .find((item) => digits.startsWith(item.dialCode));
  return country
    ? { countryCode: country.iso2, localNumber: digits.slice(country.dialCode.length) }
    : { countryCode: DEFAULT_PHONE_COUNTRY, localNumber: digits };
}

export function PhoneNumberField({
  id,
  name,
  defaultValue = "",
  required = false,
  className,
  onValueChange,
}: {
  id: string;
  name?: string;
  defaultValue?: string;
  required?: boolean;
  className?: string;
  onValueChange?: (value: string) => void;
}) {
  const initial = splitPhoneNumber(defaultValue);
  const [countryCode, setCountryCode] = useState(initial.countryCode);
  const [phoneNumber, setPhoneNumber] = useState(initial.localNumber);
  const value = `+${getDialCode(countryCode)}${phoneNumber}`;

  function updateCountry(nextCountry: string) {
    setCountryCode(nextCountry);
    onValueChange?.(`+${getDialCode(nextCountry)}${phoneNumber}`);
  }

  function updatePhone(nextPhone: string) {
    const digits = nextPhone.replace(/[^\d]/g, "").slice(0, 15);
    setPhoneNumber(digits);
    onValueChange?.(`+${getDialCode(countryCode)}${digits}`);
  }

  return (
    <>
      <div className="flex items-stretch gap-2">
        <Select
          value={countryCode}
          onValueChange={(value) => updateCountry((value as string) ?? DEFAULT_PHONE_COUNTRY)}
        >
          <SelectTrigger className="w-[5.75rem] shrink-0" aria-label="Country code">
            <span className="flex items-center gap-1.5">
              <span className="text-base leading-none">{getCountryFlagEmoji(countryCode)}</span>
              +{getDialCode(countryCode)}
            </span>
          </SelectTrigger>
          <SelectContent align="start" alignItemWithTrigger={false}>
            <SelectGroup>
              {PHONE_COUNTRIES.map((country) => (
                <SelectItem key={country.iso2} value={country.iso2}>
                  <span aria-hidden="true">{getCountryFlagEmoji(country.iso2)}</span>
                  {country.name}
                  <span className="ml-auto text-muted-foreground">+{country.dialCode}</span>
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <input
          id={id}
          type="tel"
          autoComplete="tel-national"
          inputMode="numeric"
          required={required}
          value={phoneNumber}
          onChange={(event) => updatePhone(event.target.value)}
          placeholder="Phone number"
          className={className}
        />
      </div>
      {name ? <input type="hidden" name={name} value={value} /> : null}
    </>
  );
}
