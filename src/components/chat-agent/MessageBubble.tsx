"use client";

import type { ChatMessage } from "@/lib/chat-types";

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}
    >
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "bg-orange text-background rounded-br-sm"
            : "bg-warm-black border border-warm-gray text-foreground rounded-bl-sm"
        }`}
      >
        {/* Render message content with basic markdown-like formatting */}
        {message.content.split("\n").map((line, i) => (
          <p key={i} className={i > 0 ? "mt-2" : ""}>
            {renderLine(line)}
          </p>
        ))}
      </div>
    </div>
  );
}

function renderLine(line: string): React.ReactNode {
  // Bold: **text**
  const parts = line.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-orange-light">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}
