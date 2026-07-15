"use client";

import { useState } from "react";
import { Plus, X, Check, MoreVertical, Trash2, Heart, Edit2 } from "lucide-react";
import { ViewRow } from "@/lib/views-api";

type Props = {
  views: ViewRow[];
  activeViewId: string | null;
  onSelect: (viewId: string | null) => void;
  onCreate: (name: string) => void;
  onDelete: (viewId: string) => void;
  onUpdate: (viewId: string, updates: { name?: string; filters?: any; sorts?: any }) => void;
  onSetDefault: (viewId: string) => void;
  hasUnsavedChanges: boolean;
  onSaveChanges: () => void;
};

export default function ViewBar({
  views,
  activeViewId,
  onSelect,
  onCreate,
  onDelete,
  onUpdate,
  onSetDefault,
  hasUnsavedChanges,
  onSaveChanges,
}: Props) {
  const [showCreateInput, setShowCreateInput] = useState(false);
  const [newViewName, setNewViewName] = useState("");
  const [editingViewId, setEditingViewId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newViewName.trim()) return;
    onCreate(newViewName.trim());
    setNewViewName("");
    setShowCreateInput(false);
  };

  const handleStartRename = (view: ViewRow) => {
    setEditingViewId(view.id);
    setEditingName(view.name);
    setActiveMenuId(null);
  };

  const handleRenameSubmit = (viewId: string) => {
    if (!editingName.trim()) return;
    onUpdate(viewId, { name: editingName.trim() });
    setEditingViewId(null);
  };

  return (
    <div className="flex flex-col gap-3 border-b border-border-subtle pb-2">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Tabs container */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Default 'All' view tab */}
          <button
            type="button"
            onClick={() => onSelect(null)}
            className={`relative flex items-center h-8 px-4 text-xs font-medium rounded-lg border transition-all ${
              activeViewId === null
                ? "bg-orbit-primary/10 border-orbit-primary/30 text-orbit-primary"
                : "border-border-subtle bg-bg-tertiary/40 text-text-secondary hover:bg-surface-hover hover:text-text-primary"
            }`}
          >
            All
          </button>

          {/* Custom Views */}
          {views.map((view) => {
            const isActive = activeViewId === view.id;
            const isEditing = editingViewId === view.id;

            return (
              <div key={view.id} className="relative flex items-center group">
                {isEditing ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleRenameSubmit(view.id);
                    }}
                    className="flex items-center"
                  >
                    <input
                      type="text"
                      className="h-8 px-2 text-xs border border-orbit-primary rounded-lg bg-bg-secondary text-text-primary outline-none min-w-[100px] max-w-[150px]"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={() => handleRenameSubmit(view.id)}
                      autoFocus
                    />
                  </form>
                ) : (
                  <div
                    className={`flex items-center h-8 pl-4 pr-2 text-xs font-medium rounded-lg border transition-all ${
                      isActive
                        ? "bg-orbit-primary/10 border-orbit-primary/30 text-orbit-primary"
                        : "border-border-subtle bg-bg-tertiary/40 text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onSelect(view.id)}
                      className="pr-1 text-left whitespace-nowrap"
                    >
                      {view.name}
                      {view.isDefault && (
                        <Heart className="inline-block h-3 w-3 ml-1.5 fill-orbit-primary text-orbit-primary" />
                      )}
                    </button>

                    {/* Actions menu trigger */}
                    <div className="relative ml-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(activeMenuId === view.id ? null : view.id);
                        }}
                        className="p-0.5 rounded hover:bg-bg-tertiary text-text-tertiary hover:text-text-primary"
                        aria-label="View actions"
                      >
                        <MoreVertical className="h-3.5 w-3.5" />
                      </button>

                      {activeMenuId === view.id && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setActiveMenuId(null)}
                          />
                          <div className="absolute right-0 mt-1.5 w-36 rounded-xl border border-border-subtle bg-bg-secondary p-1 shadow-lg z-20">
                            <button
                              type="button"
                              onClick={() => handleStartRename(view)}
                              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-text-primary hover:bg-surface-hover"
                            >
                              <Edit2 className="h-3 w-3" />
                              Rename
                            </button>
                            {!view.isDefault && (
                              <button
                                type="button"
                                onClick={() => {
                                  onSetDefault(view.id);
                                  setActiveMenuId(null);
                                }}
                                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-text-primary hover:bg-surface-hover"
                              >
                                <Heart className="h-3 w-3" />
                                Set default
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                onDelete(view.id);
                                setActiveMenuId(null);
                              }}
                              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-red-400 hover:bg-red-500/10"
                            >
                              <Trash2 className="h-3 w-3" />
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* New View Inline Form */}
          {showCreateInput ? (
            <form onSubmit={handleCreate} className="flex items-center gap-1">
              <input
                type="text"
                placeholder="View name..."
                className="h-8 px-3 text-xs border border-border-subtle rounded-lg bg-bg-secondary text-text-primary outline-none"
                value={newViewName}
                onChange={(e) => setNewViewName(e.target.value)}
                autoFocus
              />
              <button
                type="submit"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-orbit-primary/20 bg-orbit-primary/10 text-orbit-primary hover:bg-orbit-primary/20"
                aria-label="Save view"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setShowCreateInput(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-subtle bg-bg-tertiary/40 text-text-tertiary hover:bg-surface-hover"
                aria-label="Cancel"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setShowCreateInput(true)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-subtle bg-bg-tertiary/40 text-text-tertiary hover:bg-surface-hover hover:text-text-primary"
              aria-label="Create new view"
            >
              <Plus className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Unsaved changes alert / save button */}
        {hasUnsavedChanges && activeViewId && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-text-tertiary">Changes detected</span>
            <button
              type="button"
              onClick={onSaveChanges}
              className="flex h-7 items-center justify-center px-3 rounded-lg bg-orbit-primary/10 border border-orbit-primary/20 text-orbit-primary hover:bg-orbit-primary/20 text-xs font-medium transition-all"
            >
              Save to view
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
