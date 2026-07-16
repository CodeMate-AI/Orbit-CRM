"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Loader2, X } from "lucide-react";

import tagInputHelpers from "./tag-input-helpers";
import { tagsApi, type TagRow } from "@/lib/tags-api";
import { cn } from "@/lib/utils";

const { normalizeTagName, filterTagSuggestions, buildTagTintStyle } = tagInputHelpers as {
  normalizeTagName: (value: string) => string;
  filterTagSuggestions: (tags: TagRow[], query: string, selectedNames?: string[]) => TagRow[];
  buildTagTintStyle: (color?: string) => Record<string, string>;
};

interface TagInputProps {
  workspaceId: string;
  value: string[];
  onChange: (tags: string[]) => void;
}

const DEFAULT_TAG_COLOR = "#6366f1";

function normalizeTagList(values: string[]) {
  const seen = new Set<string>();
  const nextValues: string[] = [];

  values.forEach((value) => {
    const normalized = normalizeTagName(value);
    const lookupKey = normalized.toLowerCase();
    if (!normalized || seen.has(lookupKey)) {
      return;
    }
    seen.add(lookupKey);
    nextValues.push(normalized);
  });

  return nextValues;
}

export default function TagInput({ workspaceId, value, onChange }: TagInputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [availableTags, setAvailableTags] = useState<TagRow[]>([]);
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadTags() {
      if (!workspaceId) {
        setAvailableTags([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError("");
      try {
        const rows = await tagsApi.list(workspaceId);
        if (!ignore) {
          setAvailableTags(rows.slice().sort((a, b) => a.name.localeCompare(b.name)));
        }
      } catch (loadError: any) {
        if (!ignore) {
          setAvailableTags([]);
          setError(loadError?.message || "Failed to load tags.");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadTags();

    return () => {
      ignore = true;
    };
  }, [workspaceId]);

  const selectedNames = useMemo(() => normalizeTagList(value), [value]);

  const selectedLookup = useMemo(() => {
    return new Set(selectedNames.map((tag) => normalizeTagName(tag).toLowerCase()));
  }, [selectedNames]);

  const selectedTags = useMemo(() => {
    return selectedNames.map((name) => {
      const normalized = normalizeTagName(name).toLowerCase();
      return (
        availableTags.find((tag) => normalizeTagName(tag.name).toLowerCase() === normalized) ?? {
          id: name,
          name,
          color: DEFAULT_TAG_COLOR,
        }
      );
    });
  }, [availableTags, selectedNames]);

  const filteredTags = useMemo(() => {
    return filterTagSuggestions(availableTags, query, selectedNames);
  }, [availableTags, query, selectedNames]);

  const exactMatch = useMemo(() => {
    const normalizedQuery = normalizeTagName(query).toLowerCase();
    if (!normalizedQuery) {
      return null;
    }

    return availableTags.find((tag) => normalizeTagName(tag.name).toLowerCase() === normalizedQuery) ?? null;
  }, [availableTags, query]);

  const closeDropdown = () => {
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const commitValue = (nextValues: string[]) => {
    onChange(normalizeTagList(nextValues));
  };

  const addTag = (tag: TagRow) => {
    const normalized = normalizeTagName(tag.name);
    if (!normalized) {
      return;
    }

    const nextValues = [...selectedNames];
    const normalizedLookup = normalized.toLowerCase();
    if (!selectedLookup.has(normalizedLookup)) {
      nextValues.push(tag.name);
      commitValue(nextValues);
    }

    setQuery("");
    closeDropdown();
    setError("");
    window.requestAnimationFrame(() => inputRef.current?.focus());
  };

  const removeTag = (tagName: string) => {
    const normalizedLookup = normalizeTagName(tagName).toLowerCase();
    commitValue(selectedNames.filter((name) => normalizeTagName(name).toLowerCase() !== normalizedLookup));
    setError("");
    window.requestAnimationFrame(() => inputRef.current?.focus());
  };

  const createTag = async (name: string) => {
    const normalizedName = normalizeTagName(name);
    if (!normalizedName || !workspaceId) {
      return;
    }

    const existing = availableTags.find((tag) => normalizeTagName(tag.name).toLowerCase() === normalizedName.toLowerCase());
    if (existing) {
      addTag(existing);
      return;
    }

    setIsCreating(true);
    setError("");
    try {
      const created = await tagsApi.create(workspaceId, { name: normalizedName, color: DEFAULT_TAG_COLOR });
      setAvailableTags((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
      addTag(created);
    } catch (createError: any) {
      setError(createError?.message || "Failed to create tag.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeDropdown();
      return;
    }

    if (event.key === "Tab") {
      closeDropdown();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (filteredTags.length === 0) {
        return;
      }
      setIsOpen(true);
      setActiveIndex((current) => (current < 0 ? 0 : (current + 1) % filteredTags.length));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (filteredTags.length === 0) {
        return;
      }
      setIsOpen(true);
      setActiveIndex((current) => (current <= 0 ? filteredTags.length - 1 : current - 1));
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const activeTag = activeIndex >= 0 ? filteredTags[activeIndex] : null;
      if (activeTag) {
        addTag(activeTag);
        return;
      }

      const trimmedQuery = normalizeTagName(query);
      if (!trimmedQuery) {
        closeDropdown();
        return;
      }

      if (exactMatch) {
        addTag(exactMatch);
        return;
      }

      void createTag(trimmedQuery);
    }
  };

  const handleChange = (nextValue: string) => {
    setQuery(nextValue);
    setIsOpen(true);
    setActiveIndex(-1);
    setError("");
  };

  const placeholder = selectedNames.length > 0 ? "Add another tag" : "Start typing to add tags";
  const showDropdown = isOpen && (isFocused || query.trim().length > 0 || isLoading);

  return (
    <div className="relative">
      <div className="rounded-2xl border border-border-subtle bg-bg-tertiary/40 px-3 py-3 shadow-sm transition focus-within:border-orbit-primary/60 focus-within:ring-1 focus-within:ring-orbit-primary/20">
        <div className="flex min-h-12 flex-wrap items-center gap-2">
          {selectedTags.map((tag) => {
            const tintStyle = buildTagTintStyle(tag.color);
            return (
              <span
                key={`${tag.name}-${tag.id}`}
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium"
                style={tintStyle}
              >
                <span className="max-w-44 truncate">{tag.name}</span>
                <button
                  type="button"
                  className="inline-flex h-5 w-5 items-center justify-center rounded-full transition hover:bg-white/10 hover:text-white"
                  aria-label={`Remove ${tag.name}`}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => removeTag(tag.name)}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            );
          })}

          <div className="relative min-w-[180px] flex-1">
            <input
              ref={inputRef}
              className="h-10 w-full bg-transparent text-sm text-text-primary outline-none placeholder:text-text-tertiary"
              placeholder={placeholder}
              value={query}
              autoComplete="off"
              role="combobox"
              aria-expanded={showDropdown}
              aria-autocomplete="list"
              onFocus={() => {
                setIsFocused(true);
                setIsOpen(true);
              }}
              onBlur={() => {
                setIsFocused(false);
                closeDropdown();
              }}
              onChange={(event) => handleChange(event.target.value)}
              onKeyDown={handleKeyDown}
            />
            <ChevronDown className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
          </div>
        </div>

        {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
        {isCreating && <p className="mt-2 text-xs text-text-tertiary">Creating tag…</p>}
      </div>

      {showDropdown && (
        <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-border-subtle bg-bg-tertiary/95 shadow-2xl backdrop-blur-sm">
          <div className="max-h-64 overflow-auto p-2">
            {isLoading ? (
              <div className="flex items-center gap-2 px-3 py-4 text-sm text-text-secondary">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading tags…
              </div>
            ) : filteredTags.length > 0 ? (
              <div className="space-y-1">
                {filteredTags.map((tag, index) => {
                  const isSelected = activeIndex === index;
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition",
                        isSelected
                          ? "bg-surface-hover text-text-primary"
                          : "text-text-secondary hover:bg-surface-hover hover:text-text-primary",
                      )}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => addTag(tag)}
                      onMouseEnter={() => setActiveIndex(index)}
                    >
                      <span className="h-3 w-3 shrink-0 rounded-full border border-border-subtle" style={{ backgroundColor: tag.color }} />
                      <span className="min-w-0 flex-1 truncate">{tag.name}</span>
                      {selectedLookup.has(normalizeTagName(tag.name).toLowerCase()) && (
                        <span className="text-xs uppercase tracking-[0.2em] text-text-tertiary">Selected</span>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : query.trim() ? (
              <div className="rounded-xl px-3 py-4 text-sm text-text-secondary">
                Press Enter to create “{normalizeTagName(query)}”
              </div>
            ) : (
              <div className="rounded-xl px-3 py-4 text-sm text-text-secondary">No tags yet</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
