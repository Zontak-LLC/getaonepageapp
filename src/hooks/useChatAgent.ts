"use client";

import { useState, useCallback, useRef } from "react";
import type {
  ChatMessage,
  OptionCard,
  BuildProgress,
  SSEEvent,
  SpecStatus,
} from "@/lib/chat-types";
import type { SiteSpec } from "@/lib/intake-types";
import type { ProjectIntakeData } from "@/lib/intake-types";

/* ─── Hook State ─── */

interface ChatAgentState {
  messages: ChatMessage[];
  partialSpec: Partial<SiteSpec>;
  partialIntake: Partial<ProjectIntakeData>;
  specStatus: SpecStatus;
  buildProgress: BuildProgress | null;
  isStreaming: boolean;
  streamingText: string;
  error: string | null;
}

/* ─── Hook ─── */

export function useChatAgent() {
  const [state, setState] = useState<ChatAgentState>({
    messages: [],
    partialSpec: {},
    partialIntake: {},
    specStatus: "gathering",
    buildProgress: null,
    isStreaming: false,
    streamingText: "",
    error: null,
  });

  const sessionIdRef = useRef<string>(
    `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  );

  /* ─── Send Message ─── */

  const sendMessage = useCallback(
    async (message: string) => {
      if (state.isStreaming) return;

      // Add user message optimistically
      const userMsg: ChatMessage = {
        id: `msg_${Date.now()}_user`,
        role: "user",
        content: message,
        timestamp: new Date().toISOString(),
      };

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, userMsg],
        isStreaming: true,
        streamingText: "",
        error: null,
      }));

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: sessionIdRef.current,
            message,
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(
            (errData as { error?: string }).error ??
              `HTTP ${response.status}`,
          );
        }

        // Read SSE stream
        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let buffer = "";
        let fullStreamText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6).trim();
            if (!jsonStr) continue;

            try {
              const event = JSON.parse(jsonStr) as SSEEvent;
              handleSSEEvent(event, fullStreamText, (text) => {
                fullStreamText = text;
              });
            } catch {
              // Malformed SSE event — skip
            }
          }
        }
      } catch (err) {
        setState((prev) => ({
          ...prev,
          isStreaming: false,
          streamingText: "",
          error: err instanceof Error ? err.message : "Unknown error",
        }));
      }
    },
    [state.isStreaming],
  );

  /* ─── Handle SSE Events ─── */

  const handleSSEEvent = useCallback(
    (
      event: SSEEvent,
      currentStreamText: string,
      setStreamText: (text: string) => void,
    ) => {
      switch (event.type) {
        case "message_delta": {
          const { text } = event.data as { text: string };
          const newText = currentStreamText + text;
          setStreamText(newText);
          setState((prev) => ({ ...prev, streamingText: newText }));
          break;
        }

        case "message_done": {
          const { message, specStatus } = event.data as {
            message: ChatMessage;
            specStatus: SpecStatus;
          };
          setState((prev) => ({
            ...prev,
            messages: [...prev.messages, message],
            specStatus,
            isStreaming: false,
            streamingText: "",
          }));
          break;
        }

        case "spec_update": {
          const specData = event.data as Partial<SiteSpec>;
          setState((prev) => ({
            ...prev,
            partialSpec: { ...prev.partialSpec, ...specData },
          }));
          break;
        }

        case "intake_update": {
          const intakeData = event.data as Partial<ProjectIntakeData>;
          setState((prev) => ({
            ...prev,
            partialIntake: deepMergeIntake(prev.partialIntake, intakeData),
          }));
          break;
        }

        case "options": {
          // Options are embedded in the message_done event via message.options
          // No additional state update needed here
          break;
        }

        case "spec_complete": {
          setState((prev) => ({ ...prev, specStatus: "reviewing" }));
          break;
        }

        case "error": {
          const { message } = event.data as { message: string };
          setState((prev) => ({
            ...prev,
            isStreaming: false,
            streamingText: "",
            error: message,
          }));
          break;
        }
      }
    },
    [],
  );

  /* ─── Select Option ─── */

  const selectOption = useCallback(
    (value: string, label: string) => {
      sendMessage(`${label} (${value})`);
    },
    [sendMessage],
  );

  /* ─── Start Over (clean slate) ─── */

  const startOver = useCallback(() => {
    sessionIdRef.current = `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    setState({
      messages: [],
      partialSpec: {},
      partialIntake: {},
      specStatus: "gathering",
      buildProgress: null,
      isStreaming: false,
      streamingText: "",
      error: null,
    });
  }, []);

  /* ─── Approve Spec & Start Build ─── */

  const approveSpec = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      specStatus: "approved",
      buildProgress: { phase: "building", message: "Starting build..." },
    }));

    // Fill default values for missing intake fields
    const intake = fillDefaults(state.partialIntake);
    const spec = state.partialSpec as SiteSpec;

    try {
      const response = await fetch("/api/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          spec,
          intake,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(
          (errData as { error?: string }).error ?? `HTTP ${response.status}`,
        );
      }

      // Read SSE stream for build progress
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;

          try {
            const event = JSON.parse(jsonStr) as SSEEvent;
            if (event.type === "phase") {
              setState((prev) => ({
                ...prev,
                buildProgress: event.data as BuildProgress,
              }));
            } else if (event.type === "complete") {
              setState((prev) => ({
                ...prev,
                buildProgress: {
                  phase: "complete",
                  message: "Build complete!",
                  ...(event.data as Record<string, unknown>),
                } as BuildProgress,
              }));
            } else if (event.type === "error") {
              setState((prev) => ({
                ...prev,
                buildProgress: {
                  phase: "failed",
                  message: (event.data as { message: string }).message,
                },
              }));
            }
          } catch {
            // skip
          }
        }
      }
    } catch (err) {
      setState((prev) => ({
        ...prev,
        buildProgress: {
          phase: "failed",
          message: err instanceof Error ? err.message : "Build failed",
        },
      }));
    }
  }, [state.partialSpec, state.partialIntake]);

  return {
    ...state,
    sendMessage,
    selectOption,
    approveSpec,
    startOver,
  };
}

/* ─── Helpers ─── */

function deepMergeIntake(
  current: Partial<ProjectIntakeData>,
  update: Partial<ProjectIntakeData>,
): Partial<ProjectIntakeData> {
  const result = { ...current };
  if (update.business) {
    result.business = {
      ...result.business,
      ...update.business,
    } as ProjectIntakeData["business"];
  }
  if (update.project) {
    result.project = {
      ...result.project,
      ...update.project,
    } as ProjectIntakeData["project"];
  }
  if (update.style) {
    result.style = {
      ...result.style,
      ...update.style,
    } as ProjectIntakeData["style"];
  }
  if (update.contact) {
    result.contact = {
      ...result.contact,
      ...update.contact,
    } as ProjectIntakeData["contact"];
  }
  return result;
}

function fillDefaults(
  partial: Partial<ProjectIntakeData>,
): ProjectIntakeData {
  return {
    business: {
      businessName: partial.business?.businessName ?? "My Business",
      businessType: partial.business?.businessType ?? "Service",
      industry: partial.business?.industry ?? "",
      website: partial.business?.website ?? "",
    },
    project: {
      description: partial.project?.description ?? "",
      goals: partial.project?.goals ?? "",
      callToAction: partial.project?.callToAction ?? "Get Started",
      content: partial.project?.content ?? "",
      imageNotes: partial.project?.imageNotes ?? "",
    },
    style: {
      stylePreset: partial.style?.stylePreset ?? "warm",
      primaryColor: partial.style?.primaryColor ?? "",
      secondaryColor: partial.style?.secondaryColor ?? "",
      styleNotes: partial.style?.styleNotes ?? "",
      inspirationUrls: partial.style?.inspirationUrls ?? "",
    },
    contact: {
      name: partial.contact?.name ?? "",
      email: partial.contact?.email ?? "",
      phone: partial.contact?.phone ?? "",
      preferredContact: partial.contact?.preferredContact ?? "email",
      additionalNotes: partial.contact?.additionalNotes ?? "",
    },
  };
}
