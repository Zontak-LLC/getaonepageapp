"use client";

import { useRef, useEffect } from "react";
import { useChatAgent } from "@/hooks/useChatAgent";
import { MessageBubble } from "./MessageBubble";
import { OptionCardGroup } from "./OptionCard";
import { SpecPreview } from "./SpecPreview";
import { BuildProgress } from "./BuildProgress";
import { ChatInput } from "./ChatInput";

export function ChatAgent() {
  const {
    messages,
    partialSpec,
    partialIntake,
    specStatus,
    buildProgress,
    isStreaming,
    streamingText,
    sendMessage,
    selectOption,
    approveSpec,
  } = useChatAgent();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isBuildPhase = !!buildProgress;

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText, buildProgress]);

  return (
    <div className="flex flex-col lg:flex-row gap-6 min-h-[400px] max-h-[600px]">
      {/* ── Chat Panel ─── */}
      <div className="flex-1 flex flex-col rounded-2xl border border-warm-gray bg-background overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-warm-gray flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-orange/10 flex items-center justify-center">
            <span className="text-orange text-sm">Z</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Zontak Agent
            </p>
            <p className="text-xs text-foreground/40">
              {isBuildPhase
                ? "Building your site..."
                : specStatus === "reviewing"
                  ? "Review your spec"
                  : "Tell me about your project"}
            </p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4">

          {messages.map((msg) => (
            <div key={msg.id}>
              <MessageBubble message={msg} />
              {/* Show option cards after assistant messages */}
              {msg.role === "assistant" && msg.options && msg.options.length > 0 && (
                <OptionCardGroup
                  cards={msg.options}
                  onSelect={(value) =>
                    selectOption(value, msg.options!.find((o) => o.value === value)?.label ?? value)
                  }
                  disabled={isStreaming}
                />
              )}
            </div>
          ))}

          {/* Streaming indicator */}
          {isStreaming && streamingText && (
            <div className="flex justify-start mb-4">
              <div className="max-w-[80%] rounded-2xl rounded-bl-sm px-4 py-3 text-sm leading-relaxed bg-warm-black border border-warm-gray text-foreground">
                {streamingText.split("\n").map((line, i) => (
                  <p key={i} className={i > 0 ? "mt-2" : ""}>
                    {line}
                  </p>
                ))}
                <span className="inline-block w-2 h-4 bg-orange/60 animate-pulse ml-0.5" />
              </div>
            </div>
          )}

          {isStreaming && !streamingText && (
            <div className="flex justify-start mb-4">
              <div className="rounded-2xl rounded-bl-sm px-4 py-3 bg-warm-black border border-warm-gray">
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-orange/40 animate-bounce" />
                  <span
                    className="w-2 h-2 rounded-full bg-orange/40 animate-bounce"
                    style={{ animationDelay: "0.15s" }}
                  />
                  <span
                    className="w-2 h-2 rounded-full bg-orange/40 animate-bounce"
                    style={{ animationDelay: "0.3s" }}
                  />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        {!isBuildPhase && (
          <ChatInput
            onSend={sendMessage}
            disabled={isStreaming}
            placeholder={
              specStatus === "reviewing"
                ? "Ask to change something, or approve the spec..."
                : "Describe your project..."
            }
          />
        )}
      </div>

      {/* ── Sidebar ─── */}
      <div className="lg:w-80 shrink-0">
        {isBuildPhase ? (
          <BuildProgress progress={buildProgress} />
        ) : (
          <SpecPreview
            spec={partialSpec}
            intake={partialIntake}
            specStatus={specStatus}
            onApprove={approveSpec}
          />
        )}
      </div>
    </div>
  );
}
