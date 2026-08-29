import { type SupportMessageView } from "@/lib/support";
import { formatMessageTime } from "@/lib/format";

export function SupportMessageList({ messages }: { messages: SupportMessageView[] }) {
  return (
    <div className="flex flex-col gap-3">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${message.isMine ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
              message.isMine
                ? "rounded-br-sm bg-primary text-primary-foreground"
                : "rounded-bl-sm border border-border/70 bg-background text-foreground"
            }`}
          >
            <p className="whitespace-pre-wrap break-words">{message.body}</p>
            <p
              className={`mt-1 text-[0.65rem] ${
                message.isMine ? "text-primary-foreground/70" : "text-muted-foreground"
              }`}
            >
              {formatMessageTime(message.createdAt)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
