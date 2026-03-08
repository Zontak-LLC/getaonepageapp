"use client";

import { useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useChatAgent } from "@/hooks/useChatAgent";
import { MessageBubble } from "./MessageBubble";
import { OptionCardGroup } from "./OptionCard";
import { SpecPreview } from "./SpecPreview";
import { BuildProgress } from "./BuildProgress";
import { ChatInput } from "./ChatInput";

export function ChatAgent() {
  const { status: authStatus } = useSession();
  const {
    messages,
    partialSpec,
    partialIntake,
    specStatus,
    buildProgress,
    isStreaming,
    streamingText,
    error,
    sendMessage,
    selectOption,
    approveSpec,
    startOver,
  } = useChatAgent();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isBuildPhase = !!buildProgress;
  const hasConversation = messages.length > 0 || isStreaming;

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText, buildProgress]);

  return (
    <div className={`flex flex-col lg:flex-row gap-6${hasConversation ? " min-h-[400px] max-h-[600px]" : ""}`}>
      {/* ── Chat Panel ─── */}
      <div className="flex-1 flex flex-col rounded-2xl border border-warm-gray bg-background overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-warm-gray flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-orange/10 flex items-center justify-center">
            <span className="text-orange text-sm">Z</span>
          </div>
          <div className="flex-1">
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
          {/* Start Over button */}
          {hasConversation && !isStreaming && (
            <button
              type="button"
              onClick={startOver}
              className="flex items-center gap-1.5 text-xs text-foreground/40 hover:text-orange transition-colors px-3 py-1.5 rounded-lg hover:bg-orange/5"
              title="Start a new project"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Start Over
            </button>
          )}
        </div>

        {/* Messages */}
        <div className={`overflow-y-auto px-6${hasConversation ? " flex-1 py-4" : " py-0"}`}>

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

          {/* Error display */}
          {error && (
            <div className="flex justify-start mb-4">
              <div className="max-w-[80%] rounded-2xl rounded-bl-sm px-4 py-3 text-sm leading-relaxed bg-red-500/10 border border-red-500/20 text-red-400">
                <p className="font-medium mb-1">Something went wrong</p>
                <p className="text-red-400/70">{error}</p>
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
          <BuildProgress progress={buildProgress} onStartOver={startOver} />
        ) : (
          <SpecPreview
            spec={partialSpec}
            intake={partialIntake}
            specStatus={specStatus}
            onApprove={approveSpec}
            isAuthenticated={authStatus === "authenticated"}
          />
        )}
      </div>
    </div>
  );
}
