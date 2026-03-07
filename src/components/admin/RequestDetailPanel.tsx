"use client";

import { useState, useEffect } from "react";

interface NodeTransition {
  from: string;
  to: string;
  edge: string;
  timestamp: string;
  durationMs: number;
}

interface RequestDetail {
  sessionId: string;
  userEmail: string;
  status: string;
  currentNode: string;
  intakeData: {
    business: { businessName: string; businessType: string; industry: string; website: string };
    project: { description: string; goals: string; callToAction: string };
    style: { stylePreset: string; primaryColor: string; secondaryColor: string };
    contact: { name: string; email: string; phone: string };
  };
  plainText: string;
  assessment?: { qualityScore: number; missingElements: string[]; qualityNotes: string };
  validation?: { scores: Record<string, number>; overallScore: number; critique: string };
  deployment?: { projectName: string; deploymentUrl: string };
  delivery?: { teamEmailSent: boolean; clientEmailSent: boolean; creditsRemaining: number; siteUrl?: string };
  history: NodeTransition[];
  createdAt: string;
  updatedAt: string;
}

export function RequestDetailPanel({
  sessionId,
  onClose,
}: {
  sessionId: string;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<RequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "intake" | "pipeline" | "timeline">("overview");

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/requests/${sessionId}`)
      .then((res) => res.json())
      .then((data) => setDetail(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [sessionId]);

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-2xl bg-warm-black border-l border-warm-gray z-50 overflow-y-auto animate-slide-in-right">
        {/* Header */}
        <div className="sticky top-0 bg-warm-black border-b border-warm-gray px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {loading ? "Loading..." : detail?.intakeData?.business?.businessName ?? "Request Detail"}
            </h2>
            <p className="text-xs text-foreground/40 font-mono mt-0.5">{sessionId.slice(0, 8)}...</p>
          </div>
          <button
            onClick={onClose}
            className="text-foreground/40 hover:text-foreground text-xl leading-none transition-colors"
          >
            &times;
          </button>
        </div>

        {loading || !detail ? (
          <div className="p-6 text-foreground/40">Loading request details...</div>
        ) : (
          <>
            {/* Tabs */}
            <div className="border-b border-warm-gray flex gap-0">
              {(["overview", "intake", "pipeline", "timeline"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2.5 text-sm capitalize transition-colors ${
                    activeTab === tab
                      ? "text-orange border-b-2 border-orange"
                      : "text-foreground/40 hover:text-foreground/60"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="p-6 space-y-6">
              {/* Overview Tab */}
              {activeTab === "overview" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <InfoCard label="Status" value={detail.status} />
                    <InfoCard label="Current Node" value={detail.currentNode} />
                    <InfoCard label="User" value={detail.userEmail} />
                    <InfoCard label="Submitted" value={new Date(detail.createdAt).toLocaleString()} />
                  </div>

                  {detail.assessment && (
                    <div className="bg-background rounded-lg p-4 border border-warm-gray">
                      <h3 className="text-sm font-medium text-foreground/70 mb-2">Assessment</h3>
                      <div className="flex items-center gap-4 mb-2">
                        <span className="text-2xl font-bold text-gradient-sun">
                          {detail.assessment.qualityScore}/10
                        </span>
                      </div>
                      <p className="text-sm text-foreground/50">{detail.assessment.qualityNotes}</p>
                      {detail.assessment.missingElements.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {detail.assessment.missingElements.map((el) => (
                            <span key={el} className="text-xs px-2 py-0.5 bg-orange/10 text-orange rounded-full">
                              {el}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {detail.validation && (
                    <div className="bg-background rounded-lg p-4 border border-warm-gray">
                      <h3 className="text-sm font-medium text-foreground/70 mb-2">Validation</h3>
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        {Object.entries(detail.validation.scores).map(([key, val]) => (
                          <div key={key} className="flex justify-between text-xs">
                            <span className="text-foreground/40 capitalize">{key}</span>
                            <span className="font-mono text-foreground/70">{val}/10</span>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-foreground/40 mt-2">{detail.validation.critique}</p>
                    </div>
                  )}

                  {detail.deployment && (
                    <div className="bg-background rounded-lg p-4 border border-warm-gray">
                      <h3 className="text-sm font-medium text-foreground/70 mb-2">Deployment</h3>
                      <a
                        href={detail.deployment.deploymentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue hover:text-blue-light underline text-sm"
                      >
                        {detail.deployment.deploymentUrl}
                      </a>
                    </div>
                  )}

                  {detail.delivery && (
                    <div className="bg-background rounded-lg p-4 border border-warm-gray">
                      <h3 className="text-sm font-medium text-foreground/70 mb-2">Delivery</h3>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-foreground/40">Team email</span>
                          <span className={detail.delivery.teamEmailSent ? "text-green-400" : "text-red-400"}>
                            {detail.delivery.teamEmailSent ? "Sent" : "Failed"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-foreground/40">Client email</span>
                          <span className={detail.delivery.clientEmailSent ? "text-green-400" : "text-red-400"}>
                            {detail.delivery.clientEmailSent ? "Sent" : "Failed"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-foreground/40">Credits remaining</span>
                          <span className="text-foreground/60">{detail.delivery.creditsRemaining}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Intake Tab */}
              {activeTab === "intake" && detail.intakeData && (
                <>
                  <Section title="Business Info">
                    <Field label="Name" value={detail.intakeData.business.businessName} />
                    <Field label="Type" value={detail.intakeData.business.businessType} />
                    <Field label="Industry" value={detail.intakeData.business.industry} />
                    <Field label="Website" value={detail.intakeData.business.website} />
                  </Section>

                  <Section title="Project Description">
                    <Field label="Description" value={detail.intakeData.project.description} />
                    <Field label="Goals" value={detail.intakeData.project.goals} />
                    <Field label="CTA" value={detail.intakeData.project.callToAction} />
                  </Section>

                  <Section title="Style Preferences">
                    <Field label="Preset" value={detail.intakeData.style.stylePreset} />
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-foreground/40">Colors:</span>
                      <span
                        className="w-5 h-5 rounded-full border border-warm-gray"
                        style={{ backgroundColor: detail.intakeData.style.primaryColor }}
                      />
                      <span
                        className="w-5 h-5 rounded-full border border-warm-gray"
                        style={{ backgroundColor: detail.intakeData.style.secondaryColor }}
                      />
                    </div>
                  </Section>

                  <Section title="Contact">
                    <Field label="Name" value={detail.intakeData.contact.name} />
                    <Field label="Email" value={detail.intakeData.contact.email} />
                    <Field label="Phone" value={detail.intakeData.contact.phone} />
                  </Section>

                  {detail.plainText && (
                    <Section title="Plain Text Brief">
                      <p className="text-sm text-foreground/60 whitespace-pre-wrap font-mono leading-relaxed">
                        {detail.plainText}
                      </p>
                    </Section>
                  )}
                </>
              )}

              {/* Pipeline Tab */}
              {activeTab === "pipeline" && (
                <div className="space-y-2">
                  {(["assess", "generate", "validate", "sanity_check", "build", "build_validate", "deploy", "deliver"] as const).map((node) => {
                    const transition = detail.history.find((t) => t.from === node);
                    const isCurrentNode = detail.currentNode === node;
                    const isCompleted = detail.history.some((t) => t.from === node);

                    return (
                      <div
                        key={node}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${
                          isCurrentNode
                            ? "border-orange/40 bg-orange/5"
                            : isCompleted
                            ? "border-warm-gray bg-background"
                            : "border-warm-gray/30 bg-background/50 opacity-40"
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${
                          isCurrentNode ? "bg-orange animate-pulse" :
                          isCompleted ? "bg-blue" : "bg-warm-gray"
                        }`} />
                        <span className="font-mono text-sm text-foreground/70 w-32">{node}</span>
                        {transition && (
                          <>
                            <span className="text-xs text-foreground/30">
                              {transition.edge}
                            </span>
                            <span className="ml-auto text-xs text-foreground/30 font-mono">
                              {formatDuration(transition.durationMs)}
                            </span>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Timeline Tab */}
              {activeTab === "timeline" && (
                <div className="space-y-0">
                  {detail.history.map((t, i) => (
                    <div key={i} className="flex gap-3 items-stretch">
                      {/* Vertical line */}
                      <div className="flex flex-col items-center">
                        <div className="w-2 h-2 rounded-full bg-blue mt-2 shrink-0" />
                        {i < detail.history.length - 1 && (
                          <div className="w-px flex-1 bg-warm-gray/50" />
                        )}
                      </div>
                      {/* Content */}
                      <div className="pb-4">
                        <div className="text-sm text-foreground/70">
                          <span className="font-mono text-blue">{t.from}</span>
                          <span className="text-foreground/30 mx-1.5">&rarr;</span>
                          <span className="font-mono text-foreground/60">{t.to}</span>
                        </div>
                        <div className="text-xs text-foreground/30 mt-0.5">
                          <span className="text-orange/70">{t.edge}</span>
                          <span className="mx-1.5">&middot;</span>
                          {formatDuration(t.durationMs)}
                          <span className="mx-1.5">&middot;</span>
                          {new Date(t.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
                  {detail.history.length === 0 && (
                    <p className="text-sm text-foreground/40">No transitions recorded yet.</p>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-background rounded-lg p-3 border border-warm-gray">
      <div className="text-xs text-foreground/40 mb-1">{label}</div>
      <div className="text-sm text-foreground/80 font-medium">{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-background rounded-lg p-4 border border-warm-gray">
      <h3 className="text-sm font-medium text-foreground/70 mb-3">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex gap-2">
      <span className="text-xs text-foreground/40 w-20 shrink-0">{label}</span>
      <span className="text-sm text-foreground/60">{value}</span>
    </div>
  );
}
