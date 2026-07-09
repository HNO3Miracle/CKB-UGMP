"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { ccc } from "@ckb-ccc/connector-react";
import {
  buildDobMetadataDraft,
  getDobMetadataName,
  getDobMetadataUri,
  hasUsableDobMetadata,
  toDobMetadataDraft,
} from "@/lib/dobMetadata";
import { useI18n } from "@/lib/i18n";
import { mintSporeFromMetadata, simulateSporeMintFromMetadata } from "@/lib/sporeMint";
import {
  DobMetadataDraft,
  MintHistoryItem,
  MintStatus,
  MintTransactionResult,
  UploadResult,
  UploadStatus,
} from "@/types/mint";

const HISTORY_STORAGE_KEY = "ckb-ugmp:mint-history";
const MAX_HISTORY_ITEMS = 12;
const TESTNET_EXPLORER_TX_URL = "https://pudge.explorer.nervos.org/transaction/";
const MINT_TIMEOUT_MS = 120000;

type UploadApiResponse = {
  upload?: UploadResult;
  error?: string;
};

type HistoryExport = {
  standard: "ckb-ugmp/history-export";
  exportedAt: string;
  items: MintHistoryItem[];
};

function formatFileSize(size: number) {
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(2)} MB`;
}

function readHistory(): MintHistoryItem[] {
  try {
    const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeHistory(items: MintHistoryItem[]) {
  window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(items.slice(0, MAX_HISTORY_ITEMS)));
}

function downloadJson(filename: string, payload: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function isMintHistoryItem(value: unknown): value is MintHistoryItem {
  if (!value || typeof value !== "object") {
    return false;
  }

  const item = value as Partial<MintHistoryItem>;

  return (
    typeof item.id === "string" &&
    typeof item.createdAt === "string" &&
    Boolean(item.upload) &&
    Boolean(item.metadata) &&
    typeof item.upload?.cid === "string" &&
    typeof item.upload?.gatewayUrl === "string" &&
    hasUsableDobMetadata(item.metadata)
  );
}

function normalizeImportedHistory(payload: unknown) {
  let rawItems: unknown[] = [];

  if (Array.isArray(payload)) {
    rawItems = payload;
  } else if (payload && typeof payload === "object") {
    const items = (payload as Partial<HistoryExport>).items;
    rawItems = Array.isArray(items) ? items : [];
  }

  return rawItems.filter(isMintHistoryItem).slice(0, MAX_HISTORY_ITEMS);
}

function getExplorerTxUrl(result: MintTransactionResult) {
  return result.mode === "real" ? `${TESTNET_EXPLORER_TX_URL}${result.txHash}` : "";
}

function getExplorerTxHashUrl(txHash: string) {
  return /^0x[a-fA-F0-9]{64}$/.test(txHash) ? `${TESTNET_EXPLORER_TX_URL}${txHash}` : "";
}

function normalizeLookupValue(value: string) {
  return value.trim().toLowerCase();
}

function itemMatchesLookup(item: MintHistoryItem, query: string) {
  const target = normalizeLookupValue(query);

  if (!target) {
    return false;
  }

  return [
    item.id,
    item.upload.cid,
    item.upload.uri,
    item.upload.gatewayUrl,
    getDobMetadataName(item.metadata),
    getDobMetadataUri(item.metadata),
    item.mint?.sporeId,
    item.mint?.txHash,
  ]
    .filter(Boolean)
    .some((value) => normalizeLookupValue(value ?? "").includes(target));
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export default function MintWorkbench() {
  const { t } = useI18n();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [metadataDraft, setMetadataDraft] = useState<DobMetadataDraft | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [mintStatus, setMintStatus] = useState<MintStatus>("idle");
  const [mintResult, setMintResult] = useState<MintTransactionResult | null>(null);
  const [history, setHistory] = useState<MintHistoryItem[]>([]);
  const [currentHistoryId, setCurrentHistoryId] = useState<string>("");
  const [historyMessage, setHistoryMessage] = useState<string>("");
  const [lookupQuery, setLookupQuery] = useState<string>("");
  const [mintLogs, setMintLogs] = useState<string[]>([]);
  const [error, setError] = useState<string>("");
  const [mintError, setMintError] = useState<string>("");
  const signer = ccc.useSigner();

  useEffect(() => {
    setHistory(readHistory());
  }, []);

  const lookupMatches = useMemo(
    () => history.filter((item) => itemMatchesLookup(item, lookupQuery)).slice(0, 5),
    [history, lookupQuery],
  );
  const lookupExplorerUrl = getExplorerTxHashUrl(lookupQuery.trim());
  const pushMintLog = (message: string) => {
    setMintLogs((current) => [`${new Date().toLocaleTimeString()} ${message}`, ...current].slice(0, 8));
    console.log(`[CKB-UGMP][mint] ${message}`);
  };

  const canUpload = selectedFile !== null && uploadStatus !== "uploading";
  const canDryRunMint =
    uploadStatus === "uploaded" &&
    metadataDraft !== null &&
    !["building", "awaiting_signature"].includes(mintStatus);
  const canProceedToMint =
    uploadStatus === "uploaded" &&
    metadataDraft !== null &&
    signer !== undefined &&
    !["building", "awaiting_signature"].includes(mintStatus);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;

    setSelectedFile(file);
    setUploadResult(null);
    setMetadataDraft(null);
    setMintResult(null);
    setCurrentHistoryId("");
    setError("");
    setMintError("");
    setHistoryMessage("");
    setUploadStatus(file ? "ready" : "idle");
    setMintStatus("idle");
    setMintLogs([]);
    setShowAdvanced(false);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      return;
    }

    setUploadStatus("uploading");
    setUploadResult(null);
    setMetadataDraft(null);
    setMintResult(null);
    setCurrentHistoryId("");
    setError("");
    setMintError("");
    setHistoryMessage("");
    setMintLogs([]);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const response = await fetch("/api/uploads/pinata", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as UploadApiResponse;

      if (!response.ok || !payload.upload) {
        throw new Error(payload.error ?? "Upload failed.");
      }

      const metadata = buildDobMetadataDraft({
        name: selectedFile.name,
        upload: payload.upload,
      });
      const historyItem: MintHistoryItem = {
        id: `${payload.upload.cid}:${Date.now()}`,
        createdAt: new Date().toISOString(),
        upload: payload.upload,
        metadata,
      };
      const nextHistory = [historyItem, ...history.filter((item) => item.upload.cid !== payload.upload?.cid)].slice(
        0,
        MAX_HISTORY_ITEMS,
      );

      setUploadResult(payload.upload);
      setMetadataDraft(metadata);
      setUploadStatus("uploaded");
      setMintStatus("ready");
      setShowAdvanced(false);
      setCurrentHistoryId(historyItem.id);
      setHistory(nextHistory);
      writeHistory(nextHistory);
      setHistoryMessage("");
      pushMintLog(`upload ok: cid=${payload.upload.cid}`);
    } catch (cause) {
      setUploadStatus("failed");
      setError(cause instanceof Error ? cause.message : "Upload failed.");
    }
  };

  const handleMint = async () => {
    if (!signer || !metadataDraft) {
      setMintError(t("needWalletAndUpload"));
      return;
    }

    setMintStatus("building");
    setMintResult(null);
    setMintError("");
    setHistoryMessage("");
    setMintLogs([]);

    try {
      pushMintLog("building transaction payload");

      const result = await Promise.race([
        mintSporeFromMetadata({
          signer,
          metadata: metadataDraft,
          onProgress: (message) => {
            if (message.includes("wallet")) {
              setMintStatus("awaiting_signature");
            }

            pushMintLog(message);
          },
        }),
        (async () => {
          await sleep(MINT_TIMEOUT_MS);
          throw new Error("Mint timeout: signature or broadcast did not complete.");
        })(),
      ]);

      setMintResult(result);
      setMintStatus("submitted");
      pushMintLog(`mint submitted: tx=${result.txHash}`);
      if (currentHistoryId) {
        const nextHistory = history.map((item) =>
          item.id === currentHistoryId
            ? {
                ...item,
                mint: result,
              }
            : item,
        );
        setHistory(nextHistory);
        writeHistory(nextHistory);
        setHistoryMessage("");
      }
    } catch (cause) {
      setMintStatus("failed");
      setMintError(cause instanceof Error ? cause.message : "Mint transaction failed.");
      pushMintLog(cause instanceof Error ? cause.message : "mint failed");
    }
  };

  const handleDryRunMint = () => {
    if (!metadataDraft) {
      setMintError(t("needUploadMetadata"));
      return;
    }

    const result = simulateSporeMintFromMetadata(metadataDraft);

    setMintResult(result);
    setMintStatus("simulated");
    setMintError("");
    setHistoryMessage("");
    pushMintLog(`dry-run ok: spore=${result.sporeId}`);

    if (currentHistoryId) {
      const nextHistory = history.map((item) =>
        item.id === currentHistoryId
          ? {
              ...item,
              mint: result,
            }
          : item,
      );
      setHistory(nextHistory);
      writeHistory(nextHistory);
      setHistoryMessage("");
    }
  };

  const handleRestoreHistory = (item: MintHistoryItem) => {
    setSelectedFile(null);
    setUploadResult(item.upload);
    setMetadataDraft(toDobMetadataDraft(item.metadata));
    setMintResult(item.mint ?? null);
    setUploadStatus("uploaded");
    setMintStatus(item.mint ? (item.mint.mode === "dry_run" ? "simulated" : "submitted") : "ready");
    setCurrentHistoryId(item.id);
    setError("");
    setMintError("");
    setHistoryMessage("");
    setMintLogs([]);
    setShowAdvanced(false);
  };

  const handleClearHistory = () => {
    setHistory([]);
    setCurrentHistoryId("");
    window.localStorage.removeItem(HISTORY_STORAGE_KEY);
    setHistoryMessage(t("historyCleared"));
  };

  const handleExportHistory = () => {
    if (history.length === 0) {
      return;
    }

    downloadJson(`ckb-ugmp-history-${new Date().toISOString().slice(0, 10)}.json`, {
      standard: "ckb-ugmp/history-export",
      exportedAt: new Date().toISOString(),
      items: history,
    } satisfies HistoryExport);
    setHistoryMessage(`Exported ${history.length} records.`);
  };

  const handleImportHistory = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";

    if (!file) {
      return;
    }

    try {
      const imported = normalizeImportedHistory(JSON.parse(await file.text()));
      if (imported.length === 0) {
        throw new Error(t("noValidHistory"));
      }

      const merged = [...imported, ...history]
        .filter((item, index, items) => items.findIndex((candidate) => candidate.id === item.id) === index)
        .slice(0, MAX_HISTORY_ITEMS);

      setHistory(merged);
      writeHistory(merged);
      setHistoryMessage(`Imported ${imported.length} records. Keeping ${merged.length} records.`);
    } catch (cause) {
      setHistoryMessage(cause instanceof Error ? cause.message : t("importFailed"));
    }
  };

  const handleDownloadMetadata = () => {
    if (!metadataDraft) {
      return;
    }

    const metadataName = getDobMetadataName(metadataDraft);
    downloadJson(`${metadataName.replace(/\.[^.]+$/, "") || "dob"}-metadata.json`, metadataDraft);
  };

  return (
    <section className="glass-panel rounded-[20px] p-5 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
            {t("mintStudio")}
          </p>
          <h2 className="mt-2 text-2xl font-semibold md:text-3xl">
            {t("createDob")}
          </h2>
        </div>
        <div className="rounded-md bg-[rgba(23,32,51,0.06)] px-3 py-2 text-sm text-[var(--muted)]">
          {t("simplePath")}
        </div>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_380px]">
        <div className="grid gap-5">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-strong)] p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[var(--muted)]">{t("step01")}</p>
                <h3 className="mt-1 text-xl font-semibold">{t("chooseImageTitle")}</h3>
              </div>
              <span className="text-sm text-[var(--muted)]">
                {selectedFile ? formatFileSize(selectedFile.size) : "0 KB"}
              </span>
            </div>

            <label
              htmlFor="asset"
              className="mt-4 flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-[rgba(23,32,51,0.22)] bg-white px-5 text-center transition hover:border-[var(--accent)]"
            >
              <span className="rounded-md bg-[rgba(239,108,27,0.12)] px-3 py-2 text-sm font-semibold text-[var(--accent-dark)]">
                {t("chooseImage")}
              </span>
              <span className="mt-3 max-w-full break-words text-base font-semibold">
                {selectedFile?.name ?? t("noFileSelected")}
              </span>
              <span className="mt-2 text-sm text-[var(--muted)]">
                {t("imageLimit")}
              </span>
            </label>
            <input id="asset" type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-strong)] p-4">
            <p className="text-sm font-semibold text-[var(--muted)]">{t("step02")}</p>
            <h3 className="mt-1 text-xl font-semibold">{t("costFriendlyStorage")}</h3>
            <div className="mt-4 rounded-lg border border-[var(--border)] bg-white px-4 py-3">
              <p className="font-semibold">{t("storageLabel")}</p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                {t("storageDescription")}
              </p>
            </div>
            <p className="mt-3 text-xs leading-5 text-[var(--muted)]">
              {t("storageNote")}
            </p>
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-[#172033] p-4 text-white">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#f4b183]">
                  {t("step03")}
                </p>
                <h3 className="mt-1 text-xl font-semibold">{t("uploadToIpfs")}</h3>
              </div>
              <span className="rounded-md bg-white/10 px-3 py-2 text-sm text-slate-200">
                {uploadStatus}
              </span>
            </div>

            <button
              type="button"
              disabled={!canUpload}
              onClick={handleUpload}
              className="mt-5 w-full rounded-lg bg-white px-5 py-3 text-sm font-semibold text-[#172033] transition hover:bg-[#f4b183] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/50"
            >
              {uploadStatus === "uploading" ? t("uploading") : t("uploadToPinata")}
            </button>

            {error ? (
              <p className="mt-4 rounded-lg bg-[rgba(244,63,94,0.16)] px-4 py-3 text-sm text-rose-100">
                {error}
              </p>
            ) : null}

            {uploadResult ? (
              <div className="mt-4 grid gap-3 text-sm text-slate-200">
                <div className="rounded-lg bg-white/10 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">CID</p>
                  <p className="mt-2 break-all font-mono text-xs">{uploadResult.cid}</p>
                </div>
                <div className="rounded-lg bg-white/10 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Gateway</p>
                  <a
                    href={uploadResult.gatewayUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 block break-all font-mono text-xs underline"
                  >
                    {uploadResult.gatewayUrl}
                  </a>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <aside className="rounded-lg border border-[var(--border)] bg-[var(--surface-strong)] p-4">
          <p className="text-sm font-semibold text-[var(--muted)]">{t("preview")}</p>
          <h3 className="mt-1 text-xl font-semibold">{t("confirmBeforeMint")}</h3>
          <div className="mt-4 rounded-lg border border-[var(--border)] bg-white p-4">
            {metadataDraft ? (
              <div className="grid gap-3 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{t("name")}</p>
                  <p className="mt-1 font-semibold">{getDobMetadataName(metadataDraft)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{t("image")}</p>
                  <a
                    href={uploadResult?.gatewayUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 block break-all font-mono text-xs underline"
                  >
                    {getDobMetadataUri(metadataDraft)}
                  </a>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{t("estimatedOnChainData")}</p>
                  <p className="mt-1">
                    {t("onChainDataHint")}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-[var(--muted)]">{t("previewEmpty")}</p>
            )}
          </div>
          <button
            type="button"
            disabled={!metadataDraft}
            onClick={() => setShowAdvanced((value) => !value)}
            className="mt-3 w-full rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {showAdvanced ? t("hideAdvanced") : t("showAdvanced")}
          </button>
          {showAdvanced ? (
            <div className="mt-3">
              <pre className="max-h-[360px] overflow-auto rounded-lg bg-[#0f172a] p-4 text-xs leading-6 text-slate-100">
                {metadataDraft ? JSON.stringify(metadataDraft, null, 2) : ""}
              </pre>
              <button
                type="button"
                disabled={!metadataDraft}
                onClick={handleDownloadMetadata}
                className="mt-3 w-full rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("downloadJson")}
              </button>
            </div>
          ) : null}
          <div className="mt-4 rounded-lg border border-[var(--border)] bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-[var(--muted)]">{t("mintStatus")}</p>
              <span className="rounded-md bg-[rgba(23,32,51,0.06)] px-3 py-1 text-sm">
                {mintStatus}
              </span>
            </div>
            {!signer ? (
              <p className="mt-3 text-sm text-[var(--muted)]">{t("connectBeforeMint")}</p>
            ) : null}
            {mintError ? (
              <p className="mt-3 rounded-lg bg-[rgba(244,63,94,0.12)] px-3 py-2 text-sm text-[#9f1239]">
                {mintError}
              </p>
            ) : null}
            {mintLogs.length > 0 ? (
              <div className="mt-3 rounded-lg bg-[rgba(23,32,51,0.06)] px-3 py-2 text-xs leading-5 text-[var(--muted)]">
                {mintLogs.map((line) => (
                  <p key={line} className="break-words font-mono">
                    {line}
                  </p>
                ))}
              </div>
            ) : null}
            {mintResult ? (
              <div className="mt-3 grid gap-2 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Mode</p>
                  <p className="mt-1 font-semibold">
                    {mintResult.mode === "dry_run" ? "Dry-run only" : "On-chain submitted"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Spore ID</p>
                  <p className="mt-1 break-all font-mono text-xs">{mintResult.sporeId}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Tx Hash</p>
                  <p className="mt-1 break-all font-mono text-xs">{mintResult.txHash}</p>
                </div>
                {getExplorerTxUrl(mintResult) ? (
                  <a
                    href={getExplorerTxUrl(mintResult)}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg bg-[var(--foreground)] px-3 py-2 text-center text-sm font-semibold text-white"
                  >
                    {t("openExplorer")}
                  </a>
                ) : (
                  <p className="rounded-lg bg-[rgba(23,32,51,0.06)] px-3 py-2 text-xs leading-5 text-[var(--muted)]">
                    {t("dryRunLocalOnly")}
                  </p>
                )}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            disabled={!canProceedToMint}
            onClick={handleMint}
            className="mt-4 w-full rounded-lg bg-[var(--foreground)] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[rgba(23,32,51,0.2)]"
          >
            {mintStatus === "building"
              ? t("buildTx")
              : mintStatus === "awaiting_signature"
                ? t("waitingSignature")
                : t("mintDob")}
          </button>
          <button
            type="button"
            disabled={!canDryRunMint}
            onClick={handleDryRunMint}
            className="mt-3 w-full rounded-lg border border-[var(--border)] px-5 py-3 text-sm font-semibold text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("dryRun")}
          </button>
          <p className="mt-3 text-xs leading-5 text-[var(--muted)]">
            {t("dryRunHint")}
          </p>
        </aside>
      </div>

      <section className="mt-5 rounded-lg border border-[var(--border)] bg-[var(--surface-strong)] p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold text-[var(--muted)]">{t("assetLookup")}</p>
            <h3 className="mt-1 text-xl font-semibold">{t("viewCreatedDob")}</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
              {t("lookupDescription")}
            </p>
          </div>
          {lookupExplorerUrl ? (
            <a
              href={lookupExplorerUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg bg-[var(--foreground)] px-4 py-2 text-center text-sm font-semibold text-white"
            >
              {t("openExplorerShort")}
            </a>
          ) : null}
        </div>

        <input
          value={lookupQuery}
          onChange={(event) => setLookupQuery(event.target.value)}
          placeholder={t("searchPlaceholder")}
          className="mt-4 w-full rounded-lg border border-[var(--border)] bg-white px-4 py-3 font-mono text-sm outline-none transition focus:border-[var(--accent)]"
        />

        {lookupQuery.trim() ? (
          <div className="mt-4">
            {lookupMatches.length > 0 ? (
              <div className="grid gap-3">
                {lookupMatches.map((item) => (
                  <div
                    key={item.id}
                    className="grid gap-3 rounded-lg border border-[var(--border)] bg-white p-4 md:grid-cols-[96px_1fr_auto]"
                  >
                    <div className="aspect-square overflow-hidden rounded-lg bg-[rgba(23,32,51,0.06)]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.upload.gatewayUrl}
                        alt={getDobMetadataName(item.metadata)}
                        className="h-full w-full object-contain"
                        loading="lazy"
                      />
                    </div>
                    <div className="min-w-0 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{getDobMetadataName(item.metadata)}</p>
                        <span className="rounded-md bg-[rgba(23,32,51,0.06)] px-2 py-1 text-xs text-[var(--muted)]">
                          {item.mint ? (item.mint.mode === "dry_run" ? "dry-run" : "minted") : "uploaded"}
                        </span>
                      </div>
                      <p className="mt-2 break-all font-mono text-xs text-[var(--muted)]">{item.upload.uri}</p>
                      {item.mint ? (
                        <p className="mt-2 break-all font-mono text-xs text-[var(--muted)]">tx: {item.mint.txHash}</p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRestoreHistory(item)}
                      className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-semibold md:self-center"
                    >
                      {t("load")}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-lg bg-white px-4 py-3 text-sm text-[var(--muted)]">
                {t("noLookupMatch")}
              </p>
            )}
          </div>
        ) : null}
      </section>

      <section className="mt-5 rounded-lg border border-[var(--border)] bg-[var(--surface-strong)] p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-[var(--muted)]">{t("myDrafts")}</p>
            <h3 className="mt-1 text-xl font-semibold">{t("myCreationRecords")}</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <label
              htmlFor="history-import"
              className="cursor-pointer rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--muted)]"
            >
              {t("importHistory")}
            </label>
            <input
              id="history-import"
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={handleImportHistory}
            />
            <button
              type="button"
              disabled={history.length === 0}
              onClick={handleExportHistory}
              className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--muted)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("exportHistory")}
            </button>
            <button
              type="button"
              disabled={history.length === 0}
              onClick={handleClearHistory}
              className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--muted)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("clearHistory")}
            </button>
          </div>
        </div>

        {historyMessage ? (
          <p className="mt-4 rounded-lg bg-[rgba(23,32,51,0.06)] px-4 py-3 text-sm text-[var(--muted)]">
            {historyMessage}
          </p>
        ) : null}

        {history.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--muted)]">
            {t("historyEmpty")}
          </p>
        ) : (
          <div className="mt-4 grid gap-3">
            {history.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleRestoreHistory(item)}
                className="grid gap-3 rounded-lg border border-[var(--border)] bg-white p-4 text-left transition hover:border-[var(--accent)] md:grid-cols-[1fr_auto]"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{getDobMetadataName(item.metadata)}</p>
                    <span className="rounded-md bg-[rgba(23,32,51,0.06)] px-2 py-1 text-xs text-[var(--muted)]">
                      {item.mint ? (item.mint.mode === "dry_run" ? "dry-run" : "minted") : "uploaded"}
                    </span>
                  </div>
                  <p className="mt-2 break-all font-mono text-xs text-[var(--muted)]">{item.upload.uri}</p>
                  {item.mint ? (
                    <p className="mt-2 break-all font-mono text-xs text-[var(--muted)]">tx: {item.mint.txHash}</p>
                  ) : null}
                </div>
                <div className="text-sm text-[var(--muted)]">
                  {new Date(item.createdAt).toLocaleString()}
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
