"use client";

import Image from "next/image";
import { useState } from "react";
import { Check, ImageIcon, Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export type GuideMediaItem = { url: string; type: "photo" | "video" };

export function GuideMediaPicker({
  media,
  value,
  onChange,
}: {
  media: GuideMediaItem[];
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);

  function choose(value: string) {
    onChange(value);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button type="button" variant="outline" size="sm" className="rounded-full" disabled={media.length === 0}>
            <ImageIcon className="h-3.5 w-3.5" />
            {value ? "Change guide media" : "Choose guide media"}
          </Button>
        }
      />
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Guide section media</DialogTitle>
          <DialogDescription>
            Choose a photo or video from the guide&apos;s public profile. The selected media appears in this trip&apos;s public guide section.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-5 grid max-h-[65vh] grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3 lg:grid-cols-4">
          <button
            type="button"
            onClick={() => choose("")}
            className={`flex aspect-[4/3] flex-col items-center justify-center rounded-xl border text-center text-xs font-medium transition ${!value ? "border-primary bg-primary/10 text-primary" : "border-border/70 bg-muted/30 hover:border-primary/50"}`}
          >
            <ImageIcon className="mb-2 h-5 w-5" />
            Use default photo
          </button>
          {media.map((item) => {
            const selected = item.url === value;
            return (
              <button
                key={item.url}
                type="button"
                onClick={() => choose(item.url)}
                className={`group relative aspect-[4/3] overflow-hidden rounded-xl border bg-black text-left transition ${selected ? "border-primary ring-2 ring-primary" : "border-border/70 hover:border-primary/50"}`}
              >
                {item.type === "photo" ? (
                  <Image src={item.url} alt="Guide profile media" fill sizes="160px" quality={40} className="object-cover" />
                ) : (
                  <video src={item.url} preload="metadata" muted playsInline className="h-full w-full object-cover" />
                )}
                {item.type === "video" ? <Play className="absolute left-1/2 top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 text-white drop-shadow" /> : null}
                <span className="absolute bottom-2 left-2 rounded-full bg-black/65 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
                  {item.type}
                </span>
                {selected ? <Check className="absolute right-2 top-2 h-5 w-5 rounded-full bg-primary p-1 text-primary-foreground" /> : null}
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
