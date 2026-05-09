"use client";

import { CHANNEL_META } from "@/lib/crm/sub-status";

export function ChannelIcon({ channel, channelOther }: { channel: string; channelOther?: string | null }) {
  const meta = CHANNEL_META[channel] ?? CHANNEL_META.OUTRO;
  const label = channel === "OUTRO" && channelOther ? channelOther : meta.label;
  return (
    <span
      title={label}
      className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-700"
    >
      <span aria-hidden>{meta.emoji}</span>
      <span className="truncate max-w-[90px]">{label}</span>
    </span>
  );
}
