import type { ReactNode } from "react";

import { isSafeHttpUrl } from "@/lib/sanitize";
import { cn } from "@/lib/utils";

const INLINE_MARKDOWN = /(\[([^\]\n]{1,200})\]\(([^)\s]{1,2048})\)|`([^`\n]{1,500})`|\*\*([^*\n]{1,1000})\*\*|__([^_\n]{1,1000})__|\*([^*\n]{1,1000})\*|_([^_\n]{1,1000})_)/g;

function renderInline(value: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  INLINE_MARKDOWN.lastIndex = 0;
  while ((match = INLINE_MARKDOWN.exec(value)) !== null) {
    if (match.index > lastIndex) nodes.push(value.slice(lastIndex, match.index));

    if (match[2] !== undefined) {
      const label = match[2];
      const href = match[3];
      nodes.push(
        isSafeHttpUrl(href) ? (
          <a key={key} href={href} target="_blank" rel="noreferrer noopener" className="font-medium text-emerald-700 underline underline-offset-4 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300">
            {label}
          </a>
        ) : (
          label
        ),
      );
    } else if (match[4] !== undefined) {
      nodes.push(<code key={key} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">{match[4]}</code>);
    } else if (match[5] !== undefined || match[6] !== undefined) {
      nodes.push(<strong key={key} className="font-semibold text-foreground">{match[5] ?? match[6]}</strong>);
    } else {
      nodes.push(<em key={key}>{match[7] ?? match[8]}</em>);
    }

    lastIndex = INLINE_MARKDOWN.lastIndex;
    key += 1;
  }

  if (lastIndex < value.length) nodes.push(value.slice(lastIndex));
  return nodes;
}

/**
 * A deliberately small Markdown subset for untrusted itinerary text. It never
 * parses or injects raw HTML, limits inline token sizes, and only emits links
 * with an http(s) URL, keeping rendering safe and bounded on the server.
 */
export function SafeMarkdown({ children, className }: { children: string; className?: string }) {
  const lines = children.split("\n").slice(0, 500);
  const blocks: ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length === 0) return;
    blocks.push(
      <ul key={`list-${blocks.length}`} className="list-disc space-y-1 pl-5 marker:text-emerald-600">
        {listItems.map((item, index) => <li key={index}>{renderInline(item)}</li>)}
      </ul>,
    );
    listItems = [];
  };

  for (const [index, line] of lines.entries()) {
    const listMatch = /^[-*+]\s+(.+)$/.exec(line);
    if (listMatch) {
      listItems.push(listMatch[1]);
      continue;
    }
    flushList();

    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      const Heading = (`h${heading[1].length}`) as "h1" | "h2" | "h3";
      blocks.push(<Heading key={index} className="mt-5 text-lg font-semibold text-foreground first:mt-0">{renderInline(heading[2])}</Heading>);
    } else if (line.trim()) {
      blocks.push(<p key={index}>{renderInline(line)}</p>);
    }
  }
  flushList();

  return <div className={cn("space-y-3 text-sm leading-7 text-muted-foreground", className)}>{blocks}</div>;
}
