"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { fetchTxSummary, type RpcTxSummary } from "@/lib/ckbRpc";
import { getDobMetadataName, getDobMetadataUri } from "@/lib/dobMetadata";
import { useI18n } from "@/lib/i18n";
import type { MintHistoryItem } from "@/types/mint";

const HISTORY_STORAGE_KEY = "ckb-ugmp:mint-history";
const TESTNET_EXPLORER_TX_URL = "https://pudge.explorer.nervos.org/transaction/";

type AssetFilter = "all" | "uploaded" | "dry_run" | "real";

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

function formatFileSize(size: number) {
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(2)} MB`;
}

function getExplorerTxUrl(txHash: string) {
  return /^0x[a-fA-F0-9]{64}$/.test(txHash) ? `${TESTNET_EXPLORER_TX_URL}${txHash}` : "";
}

function normalizeLookupValue(value: string) {
  return value.trim().toLowerCase();
}

export default function DobGallery() {
  const { t } = useI18n();
  const [history, setHistory] = useState<MintHistoryItem[]>([]);
  const [filter, setFilter] = useState<AssetFilter>("all");
  const [query, setQuery] = useState("");
  const [chainLoading, setChainLoading] = useState(false);
  const [chainError, setChainError] = useState("");
  const [chainTx, setChainTx] = useState<RpcTxSummary | null>(null);

  useEffect(() => {
    setHistory(readHistory());
  }, []);

  useEffect(() => {
    const candidate = query.trim();
    if (!/^0x[a-fA-F0-9]{64}$/.test(candidate)) {
      setChainTx(null);
      setChainError("");
      setChainLoading(false);
      return;
    }

    let cancelled = false;
    setChainLoading(true);
    setChainError("");
    setChainTx(null);

    void fetchTxSummary(candidate)
      .then((summary) => {
        if (!cancelled) {
          setChainTx(summary);
        }
      })
      .catch((cause) => {
        if (!cancelled) {
          setChainError(cause instanceof Error ? cause.message : "Failed to query chain tx.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setChainLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [query]);

  const visibleItems = useMemo(
    () =>
      history.filter((item) => {
        const matchesFilter =
          filter === "all" ? true : filter === "uploaded" ? !item.mint : item.mint?.mode === filter;
        const matchesQuery =
          !query.trim() ||
          [
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
            .some((value) => normalizeLookupValue(value ?? "").includes(normalizeLookupValue(query)));

        return matchesFilter && matchesQuery;
      }),
    [filter, history, query],
  );

  return (
    <section className="glass-panel rounded-[32px] p-5 md:p-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">
            {t("collection")}
          </p>
          <h2 className="mt-2 text-3xl font-semibold md:text-4xl">{t("myDob")}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            {t("galleryIntro")}
          </p>
        </div>
        <a
          href="/"
          className="rounded-lg bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-white"
        >
          {t("continueCreate")}
        </a>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]">
        <input
          value={query}
          onChange={(event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)}
          placeholder={t("gallerySearchPlaceholder")}
          className="w-full rounded-lg border border-[var(--border)] bg-white px-4 py-3 font-mono text-sm outline-none focus:border-[var(--accent)]"
        />
        <div className="grid grid-cols-4 gap-2 rounded-lg bg-white p-1 text-sm">
          {(["all", "uploaded", "dry_run", "real"] as AssetFilter[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              className={`rounded-md px-3 py-2 font-semibold ${
                filter === item ? "bg-[var(--foreground)] text-white" : "text-[var(--muted)]"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {chainLoading ? (
        <p className="mt-4 rounded-lg bg-[rgba(23,32,51,0.06)] px-4 py-3 text-sm text-[var(--muted)]">
          {t("chainLoading")}
        </p>
      ) : null}

      {chainError ? (
        <p className="mt-4 rounded-lg bg-[rgba(244,63,94,0.12)] px-4 py-3 text-sm text-[#9f1239]">
          {t("chainErrorPrefix")}{chainError}
        </p>
      ) : null}

      {chainTx ? (
        <div className="mt-4 rounded-[24px] border border-[var(--border)] bg-white p-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-[var(--muted)]">Chain Status</p>
              <h3 className="mt-1 text-xl font-semibold">{t("chainStatus")}</h3>
            </div>
            <span className="rounded-md bg-[rgba(23,32,51,0.06)] px-2 py-1 text-xs text-[var(--muted)]">
              {chainTx.status}
            </span>
          </div>
          <div className="mt-4 grid gap-2 text-xs text-[var(--muted)]">
            <p className="break-all font-mono">tx: {chainTx.txHash}</p>
            {chainTx.blockHash ? <p className="break-all font-mono">block: {chainTx.blockHash}</p> : null}
            <p>outputs: {chainTx.outputCount}</p>
            {chainTx.firstOutput ? <p className="break-all font-mono">first lock: {JSON.stringify(chainTx.firstOutput.lock)}</p> : null}
            {chainTx.firstOutputData ? <p className="break-all font-mono">first output_data: {chainTx.firstOutputData}</p> : null}
          </div>
        </div>
      ) : null}

      <div className="mt-6 text-sm text-[var(--muted)]">
        {t("myRecords")}: {history.length}, {t("currentShown")}: {visibleItems.length}
      </div>

      {visibleItems.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--muted)]">
          {t("noGalleryMatch")}
        </p>
      ) : (
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleItems.map((item) => (
            <article key={item.id} className="overflow-hidden rounded-[24px] border border-[var(--border)] bg-white">
              <div className="aspect-[4/3] bg-[rgba(23,32,51,0.06)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.upload.gatewayUrl}
                  alt={getDobMetadataName(item.metadata)}
                  className="h-full w-full object-contain"
                  loading="lazy"
                />
              </div>
              <div className="grid gap-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold">{getDobMetadataName(item.metadata)}</h3>
                    <p className="mt-1 text-sm text-[var(--muted)]">{formatFileSize(item.upload.size)}</p>
                  </div>
                  <span className="shrink-0 rounded-md bg-[rgba(23,32,51,0.06)] px-2 py-1 text-xs text-[var(--muted)]">
                    {item.mint ? (item.mint.mode === "dry_run" ? "dry-run" : "minted") : "uploaded"}
                  </span>
                </div>

                <div className="grid gap-2 text-xs text-[var(--muted)]">
                  <p className="break-all font-mono">{item.upload.uri}</p>
                  {item.mint ? <p className="break-all font-mono">spore: {item.mint.sporeId}</p> : null}
                  {item.mint ? <p className="break-all font-mono">tx: {item.mint.txHash}</p> : null}
                  {item.mint?.mode === "dry_run" ? <p>{t("dryRunLocalResult")}</p> : null}
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <a
                    href={item.upload.gatewayUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg bg-[var(--foreground)] px-3 py-2 text-center text-sm font-semibold text-white"
                  >
                    {t("openImage")}
                  </a>
                  {item.mint && getExplorerTxUrl(item.mint.txHash) ? (
                    <a
                      href={getExplorerTxUrl(item.mint.txHash)}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-[var(--border)] px-3 py-2 text-center text-sm font-semibold"
                    >
                      {t("viewTransaction")}
                    </a>
                  ) : (
                    <span className="rounded-lg border border-[var(--border)] px-3 py-2 text-center text-sm text-[var(--muted)]">
                      {item.mint ? t("localSimulation") : t("notMinted")}
                    </span>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
