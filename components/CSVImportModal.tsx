"use client";

import { useState } from "react";
import { AlertCircle, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { peopleApi } from "@/lib/people-api";

interface CSVImportModalProps {
  open: boolean;
  workspaceId: string;
  onClose: () => void;
  onImportQueued: () => void;
}

const REQUIRED_MAPPING_FIELDS = [
  { key: "firstName", label: "First Name" },
  { key: "lastName", label: "Last Name" },
];

const OPTIONAL_MAPPING_FIELDS = [
  { key: "email", label: "Email Address" },
  { key: "phone", label: "Phone Number" },
  { key: "jobTitle", label: "Job Title" },
  { key: "companyName", label: "Company Name" },
  { key: "leadSource", label: "Lead Source" },
  { key: "industry", label: "Industry" },
];

export default function CSVImportModal({ open, workspaceId, onClose, onImportQueued }: CSVImportModalProps) {
  const [fileContent, setFileContent] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [step, setStep] = useState<"upload" | "map" | "confirm">("upload");
  const [loading, setLoading] = useState(false);

  const sampleCsvContent = `First Name,Last Name,Email,Phone,Lead Source,Industry,Company Name,Job Title
Rahul,Sharma,rahul@buildright.in,+91 98765 43210,Website,Technology,BuildRight Inc,Sales Director
Priya,Krishnan,priya@designops.co,+91 99887 76655,Referral,Design,DesignOps,Founder`;

  const handleDownloadSample = () => {
    const blob = new Blob([sampleCsvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "orbit_leads_sample.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!open) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      setFileContent(text);
      setLoading(true);
      try {
        const res = await peopleApi.dryRunImport({ csvContent: text, workspaceId });
        setHeaders(res.headers);
        setTotalRows(res.totalRows);
        setErrors(res.validationErrors);

        const initialMapping: Record<string, string> = {};
        [...REQUIRED_MAPPING_FIELDS, ...OPTIONAL_MAPPING_FIELDS].forEach((field) => {
          const matchedHeader = res.headers.find(
            (header: string) => header.toLowerCase().replace(/[\s_-]/g, "") === field.key.toLowerCase(),
          );
          if (matchedHeader) {
            initialMapping[field.key] = matchedHeader;
          }
        });

        setMapping(initialMapping);
        setStep("map");
      } catch (err: any) {
        toast.error(`Failed to parse file: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsText(file);
  };

  const handleStartImport = async () => {
    for (const field of REQUIRED_MAPPING_FIELDS) {
      if (!mapping[field.key]) {
        toast.error(`Please map the required field: ${field.label}`);
        return;
      }
    }

    setLoading(true);
    try {
      await peopleApi.startImport({
        csvContent: fileContent,
        columnMapping: mapping,
        workspaceId,
      });
      toast.success("CSV import job has been queued in background.");
      onImportQueued();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to start import.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl border border-border-subtle bg-bg-secondary p-6 shadow-2xl">
        <button onClick={onClose} className="absolute right-4 top-4 p-1 text-text-muted hover:text-text-primary">
          <X className="h-5 w-5" />
        </button>

        <h2 className="mb-4 text-lg font-semibold text-text-primary">Import Leads from CSV</h2>

        <div className="flex-1 overflow-y-auto">
          {step === "upload" && (
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border-subtle bg-bg-tertiary/20 p-8">
              {loading ? (
                <Loader2 className="h-8 w-8 animate-spin text-orbit-primary" />
              ) : (
                <label className="flex cursor-pointer flex-col items-center gap-2">
                  <Upload className="h-8 w-8 text-text-muted" />
                  <span className="text-sm font-medium text-text-primary">Upload your lead CSV file</span>
                  <input type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
                </label>
              )}
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={handleDownloadSample}
                  className="text-xs text-orbit-primary hover:underline"
                >
                  Download a sample CSV template
                </button>
              </div>
            </div>
          )}

          {step === "map" && (
            <div className="flex flex-col gap-4">
              <p className="text-xs text-text-secondary">Map your CSV headers to the Orbit database fields.</p>
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">Required Fields</p>
                {REQUIRED_MAPPING_FIELDS.map((field) => (
                  <div key={field.key} className="flex items-center justify-between gap-4">
                    <span className="text-sm font-medium text-text-primary">{field.label} *</span>
                    <select
                      className="rounded-xl border border-border-subtle bg-bg-tertiary px-3 py-2 text-sm text-text-primary outline-none focus:border-orbit-primary"
                      value={mapping[field.key] || ""}
                      onChange={(e) => setMapping((current) => ({ ...current, [field.key]: e.target.value }))}
                    >
                      <option value="">Select CSV Header</option>
                      {headers.map((header) => (
                        <option key={header} value={header}>
                          {header}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}

                <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-text-muted">Optional Fields</p>
                {OPTIONAL_MAPPING_FIELDS.map((field) => (
                  <div key={field.key} className="flex items-center justify-between gap-4">
                    <span className="text-sm text-text-secondary">{field.label}</span>
                    <select
                      className="rounded-xl border border-border-subtle bg-bg-tertiary px-3 py-2 text-sm text-text-primary outline-none focus:border-orbit-primary"
                      value={mapping[field.key] || ""}
                      onChange={(e) => setMapping((current) => ({ ...current, [field.key]: e.target.value }))}
                    >
                      <option value="">Ignored / Unmapped</option>
                      {headers.map((header) => (
                        <option key={header} value={header}>
                          {header}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              <button type="button" className="btn-primary mt-4 h-10 w-full justify-center" onClick={() => setStep("confirm") }>
                Review Import
              </button>
            </div>
          )}

          {step === "confirm" && (
            <div className="flex flex-col gap-4">
              <div className="rounded-xl border border-border-subtle bg-bg-tertiary/40 p-4 text-center">
                <p className="text-2xl font-bold text-text-primary">{totalRows}</p>
                <p className="mt-1 text-xs text-text-secondary">Total leads parsed and ready to import.</p>
              </div>

              {errors.length > 0 && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-300">
                    <AlertCircle className="h-4 w-4" />
                    <span>Dry-run Validation Warnings ({errors.length})</span>
                  </div>
                  <div className="max-h-35 space-y-1 overflow-y-auto text-xs text-amber-200/80">
                    {errors.map((error, idx) => (
                      <p key={idx}>{error}</p>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  className="flex-1 rounded-xl border border-border-subtle px-4 py-2 text-sm font-medium hover:bg-surface-hover"
                  onClick={() => setStep("map")}
                >
                  Back to Mapping
                </button>
                <button
                  type="button"
                  className="flex-1 btn-primary h-10 justify-center"
                  onClick={handleStartImport}
                  disabled={loading}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Import"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
