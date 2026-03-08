"use client";

import type { SiteSpec } from "@/lib/chat-types";
import type { ProjectIntakeData } from "@/lib/intake-types";
import type { SpecStatus } from "@/lib/chat-types";

interface SpecPreviewProps {
  spec: Partial<SiteSpec>;
  intake: Partial<ProjectIntakeData>;
  specStatus: SpecStatus;
  onApprove: () => void;
}

export function SpecPreview({
  spec,
  intake,
  specStatus,
  onApprove,
}: SpecPreviewProps) {
  const hasContent =
    spec.headline || spec.subheadline || spec.sections?.length;

  if (!hasContent) {
    return (
      <div className="rounded-2xl border border-warm-gray bg-warm-black p-6 text-center h-full flex items-center justify-center">
        <p className="text-foreground/30 text-sm">
          Your site spec will appear here as we chat...
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-warm-gray bg-warm-black p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-widest text-orange">
          Site Spec
        </h3>
        {specStatus === "reviewing" && (
          <span className="text-xs bg-orange/10 text-orange px-2 py-1 rounded-full">
            Ready for review
          </span>
        )}
        {specStatus === "approved" && (
          <span className="text-xs bg-green-500/10 text-green-400 px-2 py-1 rounded-full">
            Approved
          </span>
        )}
      </div>

      {/* Business */}
      {intake.business?.businessName && (
        <div>
          <p className="text-xs text-foreground/40 uppercase tracking-wider">
            Business
          </p>
          <p className="text-sm text-foreground font-medium mt-1">
            {intake.business.businessName}
          </p>
          {intake.business.businessType && (
            <p className="text-xs text-foreground/50">
              {intake.business.businessType}
              {intake.business.industry
                ? ` · ${intake.business.industry}`
                : ""}
            </p>
          )}
        </div>
      )}

      {/* Headline */}
      {spec.headline && (
        <div>
          <p className="text-xs text-foreground/40 uppercase tracking-wider">
            Headline
          </p>
          <p className="text-sm text-foreground font-semibold mt-1">
            {spec.headline}
          </p>
        </div>
      )}

      {/* Subheadline */}
      {spec.subheadline && (
        <div>
          <p className="text-xs text-foreground/40 uppercase tracking-wider">
            Subheadline
          </p>
          <p className="text-xs text-foreground/60 mt-1">{spec.subheadline}</p>
        </div>
      )}

      {/* Style */}
      {intake.style?.stylePreset && (
        <div>
          <p className="text-xs text-foreground/40 uppercase tracking-wider">
            Style
          </p>
          <p className="text-sm text-foreground mt-1 capitalize">
            {intake.style.stylePreset}
          </p>
        </div>
      )}

      {/* Sections */}
      {spec.sections && spec.sections.length > 0 && (
        <div>
          <p className="text-xs text-foreground/40 uppercase tracking-wider mb-2">
            Sections ({spec.sections.length})
          </p>
          <div className="space-y-2">
            {spec.sections.map((s, i) => (
              <div
                key={i}
                className="flex items-start gap-2 text-xs"
              >
                <span className="text-orange font-mono mt-0.5">
                  {i + 1}.
                </span>
                <div>
                  <p className="text-foreground font-medium">
                    {s.sectionName}
                  </p>
                  <p className="text-foreground/40">{s.purpose}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Approve button */}
      {specStatus === "reviewing" && (
        <button
          type="button"
          onClick={onApprove}
          className="w-full mt-4 py-3 bg-orange text-background font-semibold rounded-xl text-sm hover:bg-orange-light transition-colors"
        >
          Approve & Build
        </button>
      )}
    </div>
  );
}
