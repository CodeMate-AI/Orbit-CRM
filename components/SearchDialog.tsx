"use client";

// FEATURE: Global Search [Frontend] - Dialog for searching across multiple CRM entities
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useWorkspace } from "./AppLayout";
import { searchApi, SearchResults } from "@/lib/search-api";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Users, Briefcase, IndianRupee, Loader2 } from "lucide-react";

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const router = useRouter();
  const { workspaceId } = useWorkspace();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>({ people: [], companies: [], opportunities: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults({ people: [], companies: [], opportunities: [] });
      return;
    }
  }, [open]);

  useEffect(() => {
    if (!workspaceId || !query.trim()) {
      setResults({ people: [], companies: [], opportunities: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchApi.search(workspaceId, query);
        setResults(data);
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, workspaceId]);

  const handleSelect = (path: string) => {
    onOpenChange(false);
    router.push(path);
  };

  const hasResults =
    results.people.length > 0 ||
    results.companies.length > 0 ||
    results.opportunities.length > 0;

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title="Global Search" description="Type to search leads, companies, or deals...">
      <CommandInput
        placeholder="Type to search leads, companies, or deals..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList className="max-h-87.5 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center py-6 text-text-tertiary">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            <span>Searching...</span>
          </div>
        )}
        {!loading && query && !hasResults && (
          <CommandEmpty>No results found for "{query}".</CommandEmpty>
        )}
        {!loading && !query && (
          <div className="py-6 text-center text-xs text-text-muted">
            Search for records across your workspace
          </div>
        )}
        {results.people.length > 0 && (
          <CommandGroup heading="Leads">
            {results.people.map((person) => (
              <CommandItem
                key={person.id}
                value={`person-${person.id}-${person.name}`}
                onSelect={() => handleSelect(`/leads/${person.id}`)}
                className="flex cursor-pointer items-center gap-2"
              >
                <Users className="h-4 w-4 text-text-secondary" />
                <div className="flex flex-col">
                  <span className="font-medium text-text-primary">{person.name}</span>
                  {person.jobTitle && (
                    <span className="text-[10px] text-text-muted">{person.jobTitle}</span>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {results.companies.length > 0 && (
          <CommandGroup heading="Companies">
            {results.companies.map((company) => (
              <CommandItem
                key={company.id}
                value={`company-${company.id}-${company.name}`}
                onSelect={() => handleSelect(`/companies?id=${company.id}`)}
                className="flex cursor-pointer items-center gap-2"
              >
                <Briefcase className="h-4 w-4 text-text-secondary" />
                <div className="flex flex-col">
                  <span className="font-medium text-text-primary">{company.name}</span>
                  {company.domain && (
                    <span className="text-[10px] text-text-muted">{company.domain}</span>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {results.opportunities.length > 0 && (
          <CommandGroup heading="Deals">
            {results.opportunities.map((deal) => (
              <CommandItem
                key={deal.id}
                value={`deal-${deal.id}-${deal.name}`}
                onSelect={() => handleSelect(`/deals?id=${deal.id}`)}
                className="flex cursor-pointer items-center gap-2"
              >
                <IndianRupee className="h-4 w-4 text-text-secondary" />
                <div className="flex flex-col">
                  <span className="font-medium text-text-primary">{deal.name}</span>
                  <span className="text-[10px] text-text-muted">
                    {deal.stageName} {deal.amount ? `· ₹${deal.amount.toLocaleString("en-IN")}` : ""}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
