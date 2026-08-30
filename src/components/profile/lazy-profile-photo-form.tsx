"use client";

import dynamic from "next/dynamic";
import { cloneElement, useState } from "react";
import type { MouseEvent, ReactElement } from "react";

const ProfilePhotoForm = dynamic(
  () => import("@/components/profile/profile-photo-form").then((m) => m.ProfilePhotoForm),
  { loading: () => null },
);

export function LazyProfilePhotoForm({
  currentImage,
  trigger,
}: {
  currentImage: string | null;
  trigger: ReactElement<{ onClick?: (event: MouseEvent) => void }>;
}) {
  const [armed, setArmed] = useState(false);

  if (armed) {
    return <ProfilePhotoForm currentImage={currentImage} trigger={trigger} initialOpen />;
  }

  return cloneElement(trigger, {
    onClick: (event: MouseEvent) => {
      trigger.props.onClick?.(event);
      if (!event.defaultPrevented) setArmed(true);
    },
  });
}
