"use client";

import { useState, useEffect, useCallback } from "react";
import { RequestDetailPanel } from "./RequestDetailPanel";

interface RequestItem {
  id: string;
  sessionId: string;
  userEmail: string;
  businessName: string;
  industry: string;
  status: string;
  currentNode: string;
  siteUrl?: string;
  qualityScore?: number;
  validationScore?: number;
  nodeCount: number;
  createdAt: string;
  updatedAt: string;
}

interface RequestsResponse {
  items: RequestItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const STATUS_COLORS: Record<string, string> = {
  running: "bg-orange/20 text-orange border-orange/30",
  completed: "bg-blue/20 text-blue border-blue/30",
  failed: "bg-red-500/20 text-red-400 border-red-500/30",
  unknown: "bg-warm-gray text-foreground/50 border-warm-gray",
};

export function AdminDashboard({ userEmail }: { userEmail: string }) {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [emailSearch, setEmailSearch] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: "20" });
      if (statusFilter) params.set("status", statusFilter);
      if (emailSearch.trim()) params.set("email", emailSearch.trim());

      const res = await fetch(`/api/admin/requests?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");

      const data: RequestsResponse = await res.json();
      setRequests(data.items);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    } catch (err) {
      console.error("Failed to load requests:", err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, emailSearch]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleArchive = async (sessionId: string) => {
    try {
      const res = await fetch("/api/admin/requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, action: "archive" }),
      });
      if (res.ok) {
        fetchRequests();
        if (selectedSessionId === sessionId) setSelectedSessionId(null);
      }
    } catch (err) {
      console.error("Archive failed:", err);
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-warm-gray px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-foreground">
              <span className="text-gradient-sun">Admin</span> Dashboard
            </h1>
            <span className="text-sm text-foreground/40 font-mono">{total} requests</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-foreground/50">{userEmail}</span>
            <a
              href="/"
              className="text-sm text-blue hover:text-blue-light transition-colors"
            >
              Back to site
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <input
            type="text"
            placeholder="Search by email..."
            value={emailSearch}
            onChange={(e) => {
              setEmailSearch(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-warm-black border border-warm-gray rounded-lg text-sm text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-orange/50 w-64"
          />

          <div className="flex gap-1">
            {["", "running", "completed", "failed"].map((status) => (
              <button
                key={status}
                onClick={() => {
                  setStatusFilter(status);
                  setPage(1);
                }}
                className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                  statusFilter === status
                    ? "bg-orange/20 border-orange/40 text-orange"
                    : "bg-warm-black border-warm-gray text-foreground/50 hover:border-foreground/20"
                }`}
              >
                {status || "All"}
              </button>
            ))}
          </div>

          <button
            onClick={fetchRequests}
            className="ml-auto px-3 py-2 text-sm bg-warm-black border border-warm-gray rounded-lg text-foreground/50 hover:text-foreground hover:border-foreground/20 transition-colors"
          >
            Refresh
          </button>
        </div>

        {/* Table */}
        <div className="border border-warm-gray rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-warm-black/50 border-b border-warm-gray">
                  <th className="text-left px-4 py-3 text-foreground/50 font-medium">Business</th>
                  <th className="text-left px-4 py-3 text-foreground/50 font-medium">User</th>
                  <th className="text-left px-4 py-3 text-foreground/50 font-medium">Status</th>
                  <th className="text-left px-4 py-3 text-foreground/50 font-medium">Node</th>
                  <th className="text-left px-4 py-3 text-foreground/50 font-medium">Quality</th>
                  <th className="text-left px-4 py-3 text-foreground/50 font-medium">Site</th>
                  <th className="text-left px-4 py-3 text-foreground/50 font-medium">Date</th>
                  <th className="text-right px-4 py-3 text-foreground/50 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-foreground/40">
                      Loading requests...
                    </td>
                  </tr>
                ) : requests.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-foreground/40">
                      No requests found.
                    </td>
                  </tr>
                ) : (
                  requests.map((req) => (
                    <tr
                      key={req.sessionId}
                      className="border-b border-warm-gray/50 hover:bg-warm-black/30 transition-colors cursor-pointer"
                      onClick={() => setSelectedSessionId(req.sessionId)}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{req.businessName}</div>
                        <div className="text-foreground/40 text-xs">{req.industry}</div>
                      </td>
                      <td className="px-4 py-3 text-foreground/60 font-mono text-xs">
                        {req.userEmail}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 text-xs rounded-full border ${
                            STATUS_COLORS[req.status] ?? STATUS_COLORS.unknown
                          }`}
                        >
                          {req.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-foreground/50 font-mono text-xs">
                        {req.currentNode}
                        <span className="text-foreground/30 ml-1">({req.nodeCount})</span>
                      </td>
                      <td className="px-4 py-3">
                        {req.qualityScore != null && (
                          <span className={`font-mono text-xs ${
                            req.qualityScore >= 7 ? "text-green-400" :
                            req.qualityScore >= 4 ? "text-orange" : "text-red-400"
                          }`}>
                            {req.qualityScore}/10
                          </span>
                        )}
                        {req.validationScore != null && (
                          <span className="text-foreground/30 text-xs ml-1">
                            (val: {req.validationScore.toFixed(1)})
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {req.siteUrl ? (
                          <a
                            href={req.siteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue hover:text-blue-light text-xs underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            View site
                          </a>
                        ) : (
                          <span className="text-foreground/20 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-foreground/40 text-xs">
                        {formatDate(req.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleArchive(req.sessionId);
                          }}
                          className="text-xs text-foreground/30 hover:text-red-400 transition-colors"
                          title="Archive this request"
                        >
                          Archive
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <span className="text-sm text-foreground/40">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm bg-warm-black border border-warm-gray rounded-lg text-foreground/50 hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-sm bg-warm-black border border-warm-gray rounded-lg text-foreground/50 hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Detail side panel */}
      {selectedSessionId && (
        <RequestDetailPanel
          sessionId={selectedSessionId}
          onClose={() => setSelectedSessionId(null)}
        />
      )}
    </div>
  );
}
