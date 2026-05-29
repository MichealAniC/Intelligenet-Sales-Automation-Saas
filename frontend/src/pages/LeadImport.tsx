import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  FormControl,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { useNavigate } from "react-router-dom";
import { api } from "@/api/http";
import type { LeadImportResponse, LeadImportValidateResponse } from "@/api/types";

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
  const [validating, setValidating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [validateProgress, setValidateProgress] = useState<number | null>(null);
  const [importProgress, setImportProgress] = useState<number | null>(null);
  const [duplicateMode, setDuplicateMode] = useState<"update" | "skip">("update");
  const [assignmentMode, setAssignmentMode] = useState<"keep_existing" | "reassign">("keep_existing");
  const [validation, setValidation] = useState<LeadImportValidateResponse | null>(null);
  const [result, setResult] = useState<LeadImportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewSelectedRow, setPreviewSelectedRow] = useState<number | null>(null);

  const setDroppedFile = (f: File | null) => {
    setFile(f);
    setValidation(null);
    setResult(null);
    setPreviewSelectedRow(null);
  };

  const hasBlockingErrors = useMemo(() => {
    if (!validation) return true;
    if (validation.missing_required_columns.length) return true;
    return validation.issues.some((i) => i.severity === "error");
  }, [validation]);

  const previewGridRows = useMemo(() => {
    return (validation?.preview_rows ?? []).map((r: any, i) => ({ id: i, ...r }));
  }, [validation?.preview_rows]);

  const previewColumns = useMemo<GridColDef[]>(() => {
    const rows = validation?.preview_rows ?? [];
    const keys = new Set<string>();
    for (const r of rows) for (const k of Object.keys(r)) keys.add(k);
    const ordered = ["__row__", ...Array.from(keys).filter((k) => k !== "__row__")];
    return ordered.map((k) => ({
      field: k,
      headerName: k === "__row__" ? "Row" : k,
      width: k === "__row__" ? 80 : 160,
      flex: k === "__row__" ? undefined : 1,
    }));
  }, [validation?.preview_rows]);

  const issueRows = useMemo(() => {
    const issues = validation?.issues ?? result?.issues ?? [];
    return issues.map((i, idx) => ({ id: idx, ...i }));
  }, [result?.issues, validation?.issues]);

  const issueColumns = useMemo<GridColDef[]>(
    () => [
      { field: "severity", headerName: "Severity", width: 120 },
      { field: "row", headerName: "Row", width: 90 },
      { field: "field", headerName: "Field", width: 180 },
      { field: "message", headerName: "Message", flex: 1, minWidth: 320 },
    ],
    [],
  );

  const resultRows = useMemo(() => {
    const rows = result?.results ?? [];
    return rows.map((r, idx) => ({ id: idx, ...r }));
  }, [result?.results]);

  const resultColumns = useMemo<GridColDef[]>(
    () => [
      { field: "row", headerName: "Row", width: 90 },
      { field: "status", headerName: "Status", width: 160 },
      { field: "lead_id", headerName: "Lead ID", width: 140 },
      { field: "score_value", headerName: "Score", width: 110 },
      { field: "score_category", headerName: "Tier", width: 120 },
      { field: "message", headerName: "Message", flex: 1, minWidth: 280 },
    ],
    [],
  );

  const onValidate = async () => {
    if (!file) return;
    setError(null);
    setValidating(true);
    setValidateProgress(null);
    setValidation(null);
    setResult(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await api.post<LeadImportValidateResponse>("/leads/import/validate", form, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) => {
          const total = e.total ?? 0;
          if (!total) return;
          setValidateProgress(Math.min(100, Math.round((e.loaded / total) * 100)));
        },
      });
      setValidation(res.data);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Validation failed");
    } finally {
      setValidating(false);
      setValidateProgress(null);
    }
  };

  const onImport = async () => {
    if (!file) return;
    setError(null);
    setImporting(true);
    setImportProgress(null);
    setResult(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("duplicate_mode", duplicateMode);
      form.append("assignment_mode", assignmentMode);
      const res = await api.post<LeadImportResponse>("/leads/import", form, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) => {
          const total = e.total ?? 0;
          if (!total) return;
          setImportProgress(Math.min(100, Math.round((e.loaded / total) * 100)));
        },
      });
      setResult(res.data);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Import failed");
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
            .map((r) => `${r.row},row_failed,,"${(r.message ?? "Failed").replace(/"/g, '""')}"`),
        )
        .concat(
          (result.issues ?? []).map((i) => {
            const row = i.row ?? "";
            const field = i.field ?? "";
            const msg = (i.message ?? "").replace(/"/g, '""');
            return `${row},issue_${i.severity},${field},"${msg}"`;
          }),
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
          Upload a CSV or XLSX, validate columns + units, then import. Imported leads are scored and assigned immediately.
        </Typography>
      </Stack>

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Card sx={{ borderRadius: 4 }}>
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

              <Button variant="outlined" disabled={!file || validating} onClick={onValidate}>
                {validating ? "Validating..." : "Validate"}
              </Button>
              <Button
                variant="contained"
                color="primary"
                disabled={!file || !validation || hasBlockingErrors || importing}
                onClick={onImport}
              >
                {importing ? "Importing..." : "Import now"}
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

              <FormControl size="small" sx={{ minWidth: 220 }}>
                <InputLabel id="assignment-mode-label">Assignment on update</InputLabel>
                <Select
                  labelId="assignment-mode-label"
                  label="Assignment on update"
                  value={assignmentMode}
                  onChange={(e) => setAssignmentMode(e.target.value as any)}
                >
                  <MenuItem value="keep_existing">Keep existing (assign if none)</MenuItem>
                  <MenuItem value="reassign">Always reassign</MenuItem>
                </Select>
              </FormControl>
            </Stack>

            {validating && validateProgress != null ? (
              <Stack spacing={0.5}>
                <LinearProgress variant="determinate" value={validateProgress} />
                <Typography variant="caption" color="text.secondary">
                  Uploading for validation: {validateProgress}%
                </Typography>
              </Stack>
            ) : null}

            {importing && importProgress != null ? (
              <Stack spacing={0.5}>
                <LinearProgress variant="determinate" value={importProgress} />
                <Typography variant="caption" color="text.secondary">
                  Uploading for import: {importProgress}%
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
                borderRadius: 3,
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

      {validation ? (
        <Card sx={{ borderRadius: 4 }}>
          <CardContent sx={{ p: 3 }}>
            <Stack spacing={1}>
              <Typography sx={{ fontWeight: 900 }}>Validation</Typography>
              <Typography color="text.secondary" variant="body2">
                Rows detected: <b>{validation.row_count}</b>
              </Typography>
              {validation.missing_required_columns.length ? (
                <Alert severity="error">
                  Missing required columns: {validation.missing_required_columns.join(", ")}
                </Alert>
              ) : null}
              {validation.extra_columns.length ? (
                <Alert severity="info">Extra columns will be ignored: {validation.extra_columns.join(", ")}</Alert>
              ) : null}
            </Stack>

            <Divider sx={{ my: 2 }} />

            <Stack spacing={1.25}>
              <Typography sx={{ fontWeight: 900 }}>Preview</Typography>
              <Box sx={{ height: 360, width: "100%" }}>
                <DataGrid
                  rows={previewGridRows}
                  columns={previewColumns}
                  hideFooter
                  rowSelectionModel={{
                    type: "include",
                    ids: new Set(previewSelectedRow === null ? [] : [previewSelectedRow]),
                  }}
                  onRowSelectionModelChange={(m) => {
                    const first = Array.from(m.ids)[0];
                    setPreviewSelectedRow(typeof first === "number" ? first : null);
                  }}
                  sx={{
                    border: "1px solid rgba(15, 23, 42, 0.08)",
                    borderRadius: 3,
                    "& .MuiDataGrid-columnHeaders": {
                      bgcolor: "rgba(15, 23, 42, 0.02)",
                      borderBottom: "1px solid rgba(15, 23, 42, 0.08)",
                    },
                  }}
                />
              </Box>
            </Stack>

            <Divider sx={{ my: 2 }} />

            <Stack spacing={1.25}>
              <Typography sx={{ fontWeight: 900 }}>Issues</Typography>
              <Box sx={{ height: 320, width: "100%" }}>
                <DataGrid
                  rows={issueRows}
                  columns={issueColumns}
                  hideFooter
                  onRowClick={(params) => {
                    const rowNumber = (params.row as any).row as number | null | undefined;
                    if (!rowNumber) return;
                    const idx = previewGridRows.findIndex((r: any) => r.__row__ === rowNumber);
                    if (idx >= 0) setPreviewSelectedRow(idx);
                  }}
                  sx={{
                    border: "1px solid rgba(15, 23, 42, 0.08)",
                    borderRadius: 3,
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

      {result ? (
        <Card sx={{ borderRadius: 4 }}>
          <CardContent sx={{ p: 3 }}>
            <Stack spacing={1}>
              <Typography sx={{ fontWeight: 900 }}>Import results</Typography>
              <Typography color="text.secondary" variant="body2">
                Imported: <b>{result.imported_count}</b> • Updated duplicates: <b>{result.updated_count}</b> • Skipped
                duplicates: <b>{result.skipped_duplicate_count}</b> • Failed: <b>{result.failed_count}</b>
              </Typography>
              {result.batch_id ? (
                <Typography color="text.secondary" variant="body2">
                  Batch ID: <b>{result.batch_id}</b>
                </Typography>
              ) : null}
            </Stack>

            <Divider sx={{ my: 2 }} />

            <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ mb: 2 }}>
              <Button variant="outlined" onClick={() => navigate("/app/leads")}>
                Go to Leads
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
                rows={resultRows}
                columns={resultColumns}
                hideFooter
                disableRowSelectionOnClick
                sx={{
                  border: "1px solid rgba(15, 23, 42, 0.08)",
                  borderRadius: 3,
                  "& .MuiDataGrid-columnHeaders": {
                    bgcolor: "rgba(15, 23, 42, 0.02)",
                    borderBottom: "1px solid rgba(15, 23, 42, 0.08)",
                  },
                }}
              />
            </Box>
          </CardContent>
        </Card>
      ) : null}
    </Stack>
  );
}
