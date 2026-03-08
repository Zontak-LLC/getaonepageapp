"use client";

import type { BuildProgress as BuildProgressType } from "@/lib/chat-types";

interface BuildProgressProps {
  progress: BuildProgressType;
  onStartOver?: () => void;
}

const PHASES = [
  { key: "building", label: "Generating HTML + CSS", icon: "⚡" },
  { key: "validating", label: "Validating quality", icon: "🔍" },
  { key: "deploying", label: "Deploying to Vercel", icon: "🚀" },
  { key: "delivering", label: "Sending notifications", icon: "📧" },
] as const;

export function BuildProgress({ progress, onStartOver }: BuildProgressProps) {
  const currentIdx = PHASES.findIndex((p) => p.key === progress.phase);
  const isComplete = progress.phase === "complete";
  const isFailed = progress.phase === "failed";

  return (
    <div className="rounded-2xl border border-warm-gray bg-warm-black p-6 space-y-4">
      <h3 className="text-xs font-bold uppercase tracking-widest text-orange">
        {isComplete ? "Build Complete" : isFailed ? "Build Failed" : "Building Your Site"}
      </h3>

      <div className="space-y-3">
        {PHASES.map((phase, i) => {
          let status: "done" | "active" | "pending" = "pending";
          if (isComplete || i < currentIdx) status = "done";
          else if (i === currentIdx) status = isFailed ? "pending" : "active";

          return (
            <div key={phase.key} className="flex items-center gap-3">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${
                  status === "done"
                    ? "bg-green-500/20 text-green-400"
                    : status === "active"
                      ? "bg-orange/20 text-orange border border-orange/30 animate-pulse"
                      : "bg-warm-gray/50 text-foreground/30"
                }`}
              >
                {status === "done" ? "✓" : phase.icon}
              </div>
              <span
                className={`text-sm ${
                  status === "done"
                    ? "text-green-400"
                    : status === "active"
                      ? "text-foreground font-medium"
                      : "text-foreground/30"
                }`}
              >
                {phase.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Status message */}
      <p className="text-xs text-foreground/50 mt-4">{progress.message}</p>

      {/* Validation score */}
      {progress.validationScore !== undefined && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-foreground/40">Quality score:</span>
          <span
            className={`font-mono font-bold ${
              progress.validationScore >= 7
                ? "text-green-400"
                : progress.validationScore >= 5
                  ? "text-yellow-400"
                  : "text-red-400"
            }`}
          >
            {progress.validationScore.toFixed(1)}/10
          </span>
        </div>
      )}

      {/* Live site link */}
      {progress.siteUrl && (
        <a
          href={progress.siteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block mt-4 py-3 text-center bg-blue text-white font-semibold rounded-xl text-sm hover:bg-blue-light transition-colors"
        >
          View Your Live Site →
        </a>
      )}

      {/* Error state */}
      {isFailed && (
        <div className="p-3 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-xs">
          Don&apos;t worry — your brief has been sent to the team and they&apos;ll build it manually.
        </div>
      )}

      {/* Start New Project button (after complete or failed) */}
      {(isComplete || isFailed) && onStartOver && (
        <button
          type="button"
          onClick={onStartOver}
          className="w-full mt-2 py-2.5 text-center border border-foreground/10 text-foreground/50 hover:text-orange hover:border-orange/30 font-medium rounded-xl text-sm transition-colors"
        >
          Start New Project
        </button>
      )}
    </div>
  );
}
