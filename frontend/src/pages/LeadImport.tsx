import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  FormControl,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Typography,
} from "@mui/material";
import CheckCircleOutline from "@mui/icons-material/CheckCircleOutline";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { useNavigate } from "react-router-dom";
import { api } from "@/api/http";
import type { LeadImportResponse } from "@/api/types";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function LeadImport() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<number | null>(null);
  const [duplicateMode, setDuplicateMode] = useState<"update" | "skip">("update");
  const [result, setResult] = useState<LeadImportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importPhase, setImportPhase] = useState<
    "idle" | "uploading" | "scoring" | "saving" | "done"
  >("idle");

  const setDroppedFile = (f: File | null) => {
    setFile(f);
    setResult(null);
    setError(null);
  };

  const resultRows = () => {
    const rows = result?.results ?? [];
    return rows.map((r, idx) => ({ id: idx, ...r }));
  };

  const resultColumns: GridColDef[] = [
    { field: "row", headerName: "Row", width: 90 },
    { field: "status", headerName: "Status", width: 160 },
    { field: "lead_id", headerName: "Lead ID", width: 140 },
    { field: "score_value", headerName: "Score", width: 110 },
    { field: "score_category", headerName: "Tier", width: 120 },
    { field: "message", headerName: "Message", flex: 1, minWidth: 280 },
  ];

  const onImport = async () => {
    if (!file) return;
    setError(null);
    setImporting(true);
    setImportProgress(null);
    setResult(null);
    setImportPhase("uploading");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("duplicate_mode", duplicateMode);
      const res = await api.post<LeadImportResponse>("/leads/import", form, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 300_000,
        onUploadProgress: (e) => {
          const total = e.total ?? 0;
          if (!total) return;
          const pct = Math.min(100, Math.round((e.loaded / total) * 100));
          setImportProgress(pct);
          if (pct >= 100) setImportPhase("scoring");
        },
      });
      setImportPhase("saving");
      setResult(res.data);
      setImportPhase("done");
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Import failed");
      setImportPhase("idle");
    } finally {
      setImporting(false);
      setImportProgress(null);
    }
  };

  const onDownloadTemplate = async () => {
    setError(null);
    try {
      const res = await api.get("/leads/import/template", { responseType: "blob" });
      downloadBlob(res.data as Blob, "lead_import_template.csv");
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Failed to download template");
    }
  };

  const onDownloadAllowedValues = async () => {
    setError(null);
    try {
      const res = await api.get("/leads/import/allowed-values", { responseType: "blob" });
      downloadBlob(res.data as Blob, "lead_import_allowed_values.json");
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Failed to download allowed values");
    }
  };

  const onDownloadErrorReport = () => {
    if (!result) return;
    const csvText =
      result.error_report_csv ??
      ["row,type,field,message"]
        .concat(
          (result.results ?? [])
            .filter((r) => r.status === "failed")
            .map(
              (r) =>
                `${r.row},row_failed,,"${(r.message ?? "Failed").replace(/"/g, '""')}"`
            )
        )
        .join("\n");

    downloadBlob(new Blob([csvText], { type: "text/csv" }), "lead_import_error_report.csv");
  };

  return (
    <Stack spacing={2.5}>
      <Stack spacing={0.75}>
        <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: -0.6 }}>
          Import Leads (CSV/XLSX)
        </Typography>
        <Typography color="text.secondary">
          Upload a CSV or XLSX file to import leads. They will be scored by our AI model and saved as{" "}
          <b>Unassigned</b>. Use the Auto-Assignment Engine from the Leads Center to route them.
        </Typography>
      </Stack>

      {error ? <Alert severity="error">{error}</Alert> : null}
      {result ? (
        <Alert severity="success">
          Import complete. Please refresh the page to see the new leads.
        </Alert>
      ) : null}

      <Card sx={{ borderRadius: 1 }}>
        <CardContent sx={{ p: 3 }}>
          <Stack spacing={1.5}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "center" }}>
              <Button variant="outlined" onClick={onDownloadTemplate}>
                Download template
              </Button>
              <Button variant="outlined" onClick={onDownloadAllowedValues}>
                Download allowed values
              </Button>

              <Button component="label" variant="contained" color="secondary">
                Choose file
                <input
                  hidden
                  type="file"
                  accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={(e) => setDroppedFile(e.target.files?.[0] ?? null)}
                />
              </Button>

              <Typography color="text.secondary" sx={{ flex: 1 }}>
                {file ? file.name : "No file selected"}
              </Typography>

              <Button
                variant="contained"
                color="primary"
                disabled={!file || importing}
                onClick={onImport}
              >
                {importing ? "Importing..." : "Import"}
              </Button>
            </Stack>

            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
              <FormControl size="small" sx={{ minWidth: 220 }}>
                <InputLabel id="duplicate-mode-label">Duplicate handling</InputLabel>
                <Select
                  labelId="duplicate-mode-label"
                  label="Duplicate handling"
                  value={duplicateMode}
                  onChange={(e) => setDuplicateMode(e.target.value as any)}
                >
                  <MenuItem value="update">Update existing leads</MenuItem>
                  <MenuItem value="skip">Skip duplicates</MenuItem>
                </Select>
              </FormControl>
            </Stack>

            {importing ? (
              <Stack spacing={1.5} sx={{ py: 1 }}>
                <Stepper
                  activeStep={
                    importPhase === "uploading"
                      ? 0
                      : importPhase === "scoring"
                      ? 1
                      : importPhase === "saving"
                      ? 2
                      : 3
                  }
                  alternativeLabel
                >
                  <Step>
                    <StepLabel>Uploading CSV</StepLabel>
                  </Step>
                  <Step>
                    <StepLabel>Running AI Scoring</StepLabel>
                  </Step>
                  <Step>
                    <StepLabel>Validating & Saving</StepLabel>
                  </Step>
                  <Step>
                    <StepLabel>Complete</StepLabel>
                  </Step>
                </Stepper>
                {importProgress != null ? (
                  <LinearProgress
                    variant="determinate"
                    value={importProgress}
                    sx={{ height: 8, borderRadius: 1 }}
                  />
                ) : (
                  <LinearProgress sx={{ height: 8, borderRadius: 1 }} />
                )}
                <Typography variant="caption" color="text.secondary" textAlign="center">
                  {importPhase === "uploading" &&
                    `Uploading CSV... ${importProgress ?? 0}%`}
                  {importPhase === "scoring" && "Running AI Lead Scoring..."}
                  {importPhase === "saving" && "Validating & Saving leads to database..."}
                  {importPhase === "done" && "Complete! Displaying results..."}
                </Typography>
              </Stack>
            ) : null}

            <Box
              onDragOver={(e) => {
                e.preventDefault();
              }}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files?.[0] ?? null;
                setDroppedFile(f);
              }}
              sx={{
                border: "1px dashed rgba(15, 23, 42, 0.25)",
                borderRadius: 1,
                px: 2,
                py: 1.5,
                bgcolor: "rgba(15, 23, 42, 0.015)",
              }}
            >
              <Typography color="text.secondary" variant="body2">
                Drag and drop a CSV/XLSX file here, or use “Choose file”.
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {result ? (
        <Card sx={{ borderRadius: 1, border: "2px solid", borderColor: "success.main" }}>
          <CardContent sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <CheckCircleOutline color="success" sx={{ fontSize: 40 }} />
                <Stack>
                  <Typography variant="h6" sx={{ fontWeight: 900, color: "success.dark" }}>
                    Import Successful! — {result.imported_count + result.updated_count} Leads Saved
                  </Typography>
                  <Typography color="text.secondary">
                    Leads successfully imported and scored! They are now available in the Leads Center as{" "}
                    <Chip label="Unassigned" size="small" color="warning" sx={{ fontWeight: 700 }} />. Use
                    the <b>Run Auto-Assignment</b> button from the Leads Center to route them to your sales
                    team.
                  </Typography>
                </Stack>
              </Stack>

              <Divider />

              <Typography sx={{ fontWeight: 900 }}>Import results</Typography>
              <Typography color="text.secondary" variant="body2">
                Imported: <b>{result.imported_count}</b> • Updated duplicates: <b>{result.updated_count}</b>{" "}
                • Skipped duplicates: <b>{result.skipped_duplicate_count}</b> • Failed:{" "}
                <b>{result.failed_count}</b>
              </Typography>
              {result.batch_id ? (
                <Typography color="text.secondary" variant="body2">
                  Batch ID: <b>{result.batch_id}</b>
                </Typography>
              ) : null}

              <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                <Button variant="contained" color="primary" onClick={() => navigate("/app/dashboard")}>
                  Go to Dashboard
                </Button>
                <Button variant="contained" color="secondary" onClick={() => navigate("/app/leads")}>
                  Go to Leads Center
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setResult(null);
                    setFile(null);
                    setImportPhase("idle");
                  }}
                >
                  Import More Leads
                </Button>
                <Button
                  variant="outlined"
                  disabled={!result.failed_count && !(result.issues ?? []).length}
                  onClick={onDownloadErrorReport}
                >
                  Download error report
                </Button>
              </Stack>

              <Box sx={{ height: 420, width: "100%" }}>
                <DataGrid
                  rows={resultRows()}
                  columns={resultColumns}
                  hideFooter
                  disableRowSelectionOnClick
                  sx={{
                    border: "1px solid rgba(15, 23, 42, 0.08)",
                    borderRadius: 1,
                    "& .MuiDataGrid-columnHeaders": {
                      bgcolor: "rgba(15, 23, 42, 0.02)",
                      borderBottom: "1px solid rgba(15, 23, 42, 0.08)",
                    },
                  }}
                />
              </Box>
            </Stack>
          </CardContent>
        </Card>
      ) : null}
    </Stack>
  );
}
