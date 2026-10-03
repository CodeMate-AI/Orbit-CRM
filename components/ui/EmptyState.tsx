import React from "react";

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div
        className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl"
        style={{
          background: "rgba(99,102,241,0.10)",
          color: "var(--accent-primary, #6366f1)",
        }}
      >
        {icon}
      </div>
      <h3
        className="mb-2 text-base font-semibold"
        style={{ color: "var(--text-primary, #f1f5f9)" }}
      >
        {title}
      </h3>
      <p
        className="mb-6 max-w-xs text-sm leading-relaxed"
        style={{ color: "var(--text-tertiary, #64748b)" }}
      >
        {description}
      </p>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2"
          style={{
            background: "var(--accent-primary, #6366f1)",
            color: "#fff",
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

export default EmptyState;
