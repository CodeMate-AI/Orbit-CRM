"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, Loader2, Menu, Plus, Send, Sparkles, Trash2, X } from "lucide-react";
import { aiApi, type ChatMessageRow, type ChatSessionRow } from "@/lib/ai-api";
import { useWorkspace } from "./AppLayout";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { cn } from "@/lib/utils";
import { formatAiMessageContent } from "./ai-message-formatting";

interface AiChatDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const panelVariants = {
  closed: { x: "100%" },
  open: { x: 0 },
};

export default function AiChatDrawer({ open, onOpenChange }: AiChatDrawerProps) {
  const { workspaceId } = useWorkspace();
  const [sessions, setSessions] = useState<ChatSessionRow[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageRow[]>([]);
  const [input, setInput] = useState("");
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingSession, setLoadingSession] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"sessions" | "chat">("chat");
  const [isCompact, setIsCompact] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const skipNextHistoryFetchRef = useRef(false);

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) ?? null,
    [sessions, activeSessionId],
  );

  useEffect(() => {
    const updateCompactState = () => {
      setIsCompact(window.innerWidth < 768);
    };

    updateCompactState();
    window.addEventListener("resize", updateCompactState);

    return () => window.removeEventListener("resize", updateCompactState);
  }, []);

  useEffect(() => {
    if (open) {
      setActiveSessionId(null);
      setMessages([]);
      setInput("");
      if (isCompact) {
        setMobileView("chat");
      }
    }
  }, [open, isCompact]);

  useEffect(() => {
    if (!open || !workspaceId) return;

    let mounted = true;
    setLoadingSessions(true);
    aiApi
      .listSessions(workspaceId)
      .then((data) => {
        if (!mounted) return;
        setSessions(data);
      })
      .catch((error) => {
        console.error("Failed to load chat sessions:", error);
      })
      .finally(() => {
        if (mounted) setLoadingSessions(false);
      });

    return () => {
      mounted = false;
    };
  }, [open, workspaceId]);

  useEffect(() => {
    if (!open || !workspaceId || !activeSessionId) {
      setMessages([]);
      return;
    }

    if (skipNextHistoryFetchRef.current) {
      skipNextHistoryFetchRef.current = false;
      return;
    }

    let mounted = true;
    setLoadingSession(true);
    aiApi
      .getSessionDetails(activeSessionId, workspaceId)
      .then((session) => {
        if (!mounted) return;
        setMessages(session.messages ?? []);
        setSessions((current) => current.map((item) => (item.id === session.id ? { ...item, ...session } : item)));
      })
      .catch((error) => {
        console.error("Failed to load chat history:", error);
      })
      .finally(() => {
        if (mounted) setLoadingSession(false);
      });

    return () => {
      mounted = false;
    };
  }, [open, workspaceId, activeSessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        void startNewChat();
      }
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  function startNewChat() {
    setActiveSessionId(null);
    setMessages([]);
    setInput("");
    setMobileView("chat");
  }

  async function selectSession(sessionId: string) {
    setActiveSessionId(sessionId);
    setMobileView("chat");
  }

  async function deleteSession(sessionId: string) {
    if (!workspaceId) return;

    try {
      await aiApi.deleteSession(sessionId, workspaceId);
      setSessions((current) => current.filter((session) => session.id !== sessionId));
      if (activeSessionId === sessionId) {
        const nextSession = sessions.find((session) => session.id !== sessionId) ?? null;
        setActiveSessionId(nextSession?.id ?? null);
        setMessages([]);
      }
    } catch (error) {
      console.error("Failed to delete session:", error);
    }
  }

  async function handleSend() {
    if (!workspaceId || !input.trim() || sending) return;

    const content = input.trim();
    setInput("");
    setSending(true);
    setSendError(null);
    setMessages((current) => [...current, { id: `draft-${Date.now()}`, role: "user", content, createdAt: new Date().toISOString() }]);

    try {
      let sessionId = activeSessionId;
      if (!sessionId) {
        skipNextHistoryFetchRef.current = true;
        const session = await aiApi.createSession(workspaceId);
        sessionId = session.id;
        setActiveSessionId(sessionId);
        setSessions((current) => [session, ...current]);
      }
      const result = await aiApi.postMessage(sessionId, workspaceId, content);
      setMessages((current) => {
        const filtered = current.filter(
          (message) =>
            !message.id.startsWith("draft-") &&
            message.id !== result.userMessage.id &&
            message.id !== result.assistantMessage.id,
        );
        return [...filtered, result.userMessage, result.assistantMessage];
      });
      const refreshed = await aiApi.listSessions(workspaceId);
      setSessions(refreshed);
    } catch (error: any) {
      console.error("Failed to send AI message:", error);
      // Remove the failed draft message and show error to user
      setMessages((current) => current.filter((m) => !m.id.startsWith("draft-")));
      const msg = error?.message || "";
      if (msg.toLowerCase().includes("timeout") || msg.toLowerCase().includes("timed out")) {
        setSendError("The AI assistant took too long to respond. Please try again.");
      } else {
        setSendError("Failed to get a response. Please try again.");
      }
    } finally {
      setSending(false);
    }
  }

  const showSessionsColumn = !isCompact || mobileView === "sessions";
  const showChatColumn = !isCompact || mobileView === "chat";

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
          />
          <motion.aside
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-235 flex-col border-l border-border-default bg-bg-secondary/95 shadow-2xl backdrop-blur-xl md:w-235"
            initial="closed"
            animate="open"
            exit="closed"
            variants={panelVariants}
            transition={{ type: "spring", bounce: 0, duration: 0.32 }}
          >
            <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3 md:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orbit-primary/15 text-orbit-primary">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-serif text-lg text-text-primary">AI Assistant</div>
                  <p className="text-xs text-text-tertiary">Context-aware answers, summaries, and follow-up drafts</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={startNewChat} className="hidden md:inline-flex">
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  New Chat
                </Button>
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border-subtle text-text-tertiary transition hover:bg-surface-hover hover:text-text-primary"
                  aria-label="Close AI assistant"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col md:flex-row">
              {showSessionsColumn ? (
                <aside className="flex w-full flex-col border-b border-border-subtle bg-bg-primary/40 md:w-45 md:border-b-0 md:border-r md:border-border-subtle">
                  <div className="flex items-center justify-between px-4 py-3 md:hidden">
                    <button type="button" className="inline-flex items-center gap-2 text-sm text-text-secondary" onClick={() => setMobileView("chat")}>
                      <Menu className="h-4 w-4" /> Chat
                    </button>
                    <Button variant="outline" size="sm" onClick={startNewChat}>
                      <Plus className="mr-1.5 h-3.5 w-3.5" /> New
                    </Button>
                  </div>
                  <div className="hidden border-b border-border-subtle px-4 py-3 md:block">
                    <Button variant="outline" size="sm" className="w-full" onClick={startNewChat}>
                      <Plus className="mr-1.5 h-3.5 w-3.5" /> New Chat
                    </Button>
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto p-2">
                    {loadingSessions ? (
                      <div className="flex items-center justify-center py-6 text-text-tertiary">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    ) : sessions.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border-subtle p-4 text-xs text-text-tertiary">
                        No chats yet. Start a new thread.
                      </div>
                    ) : (
                      sessions.map((session) => (
                        <div
                          key={session.id}
                          className={cn(
                            "group mb-2 flex items-center justify-between rounded-xl border px-3 py-2 transition",
                            activeSessionId === session.id
                              ? "border-orbit-primary bg-orbit-primary-muted"
                              : "border-border-subtle bg-bg-secondary hover:bg-surface-hover",
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => selectSession(session.id)}
                            className="flex min-w-0 flex-1 flex-col text-left"
                          >
                            <span className="w-full truncate text-sm text-text-primary">{session.title}</span>
                            <span className="text-[11px] text-text-tertiary">{session._count?.messages ?? 0} messages</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm("Are you sure you want to delete this chat?")) {
                                void deleteSession(session.id);
                              }
                            }}
                            className="ml-2 hidden rounded p-1 text-text-tertiary hover:bg-surface-hover hover:text-red-500 group-hover:inline-flex"
                            title="Delete Chat"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </aside>
              ) : null}

              {showChatColumn ? (
                <section className="flex min-h-0 flex-1 flex-col">
                  <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3 md:px-6">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="gap-1.5">
                        <Bot className="h-3.5 w-3.5" />
                        {activeSession?.title ?? "New Chat"}
                      </Badge>
                      <span className="font-mono text-[11px] text-text-tertiary">{messages.length} msgs</span>
                    </div>
                    <div className="flex items-center gap-2 md:hidden">
                      <Button variant="ghost" size="sm" onClick={() => setMobileView("sessions")}>
                        Sessions
                      </Button>
                    </div>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6">
                    {loadingSession ? (
                      <div className="flex items-center justify-center py-12 text-text-tertiary">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading conversation…
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="mx-auto flex max-w-2xl flex-col gap-4 rounded-2xl border border-dashed border-border-subtle bg-bg-primary/40 p-6 text-sm text-text-secondary">
                        <div className="font-serif text-2xl text-text-primary">Ask anything about your workspace</div>
                        <ul className="grid gap-2 sm:grid-cols-2">
                          <li>• Summarize a lead history</li>
                          <li>• Draft a follow-up template</li>
                          <li>• Find active deal risks</li>
                          <li>• Search tasks by assignee</li>
                        </ul>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-4">
                        {messages.map((message) => (
                          <MessageBubble key={message.id} message={message} />
                        ))}
                        {sending && <ThinkingBubble />}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </div>

                  <div className="border-t border-border-subtle bg-bg-primary/70 p-4 md:p-6">
                    {sendError && (
                      <div className="mb-3 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                        <span className="flex-1">{sendError}</span>
                        <button
                          onClick={() => setSendError(null)}
                          className="ml-2 shrink-0 text-red-400/70 hover:text-red-400"
                          title="Dismiss"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                    <div className="flex flex-col gap-3 rounded-2xl border border-border-subtle bg-bg-secondary/80 p-3 shadow-sm">
                      <Textarea
                        value={input}
                        onChange={(event) => setInput(event.target.value)}
                        placeholder="Ask about a lead, deal, or draft a follow-up..."
                        className="min-h-24 resize-none border-0 bg-transparent px-1 py-1 text-sm shadow-none focus-visible:ring-0"
                        rows={4}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && !event.shiftKey) {
                            event.preventDefault();
                            void handleSend();
                          }
                        }}
                      />
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs text-text-tertiary">Press Enter to send · Shift+Enter for newline</p>
                        <Button
                          onClick={() => void handleSend()}
                          disabled={sending || !input.trim()}
                          className="bg-orbit-primary text-white hover:bg-white hover:text-black transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none"
                        >
                          {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                          Send
                        </Button>
                      </div>
                    </div>
                  </div>
                </section>
              ) : null}
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}

function MessageBubble({ message }: { message: ChatMessageRow }) {
  const isUser = message.role === "user";
  const sanitizedContent = formatAiMessageContent(message.content);

  return (
    <div
      className={cn(
        "flex max-w-[85%] flex-col gap-2 rounded-2xl border px-4 py-3 text-sm leading-7",
        isUser ? "ml-auto border-orbit-primary/20 bg-orbit-primary/15 text-text-primary" : "border-border-subtle bg-bg-secondary text-text-secondary",
      )}
    >
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-text-tertiary">
        <span>{isUser ? "You" : "Orbit AI"}</span>
      </div>
      <p className="whitespace-pre-wrap">{sanitizedContent}</p>
    </div>
  );
}

function ThinkingBubble() {
  return (
    <div className="mr-auto flex max-w-[85%] flex-col gap-2 rounded-2xl border border-border-subtle bg-bg-secondary px-4 py-3 text-sm leading-7 text-text-secondary">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-text-tertiary">
        <span>Orbit AI</span>
      </div>
      <div className="flex items-center gap-2 text-text-tertiary">
        <Sparkles className="h-4 w-4 animate-pulse text-orbit-primary" />
        <span className="animate-pulse">Orbit is thinking...</span>
      </div>
    </div>
  );
}
