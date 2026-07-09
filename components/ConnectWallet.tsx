"use client";

import React, { useEffect, useState } from "react";
import { ccc } from "@ckb-ccc/connector-react";
import { useI18n } from "@/lib/i18n";
import { formatBalance, truncateAddress } from "@/utils/stringUtils";

const ConnectWallet: React.FC = () => {
  const { open, wallet } = ccc.useCcc();
  const { t } = useI18n();
  const [balance, setBalance] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [network, setNetwork] = useState<string>("CKB Testnet");
  const [error, setError] = useState<string>("");
  const signer = ccc.useSigner();

  useEffect(() => {
    if (!signer) {
      setAddress("");
      setBalance("");
      setError("");
      return;
    }

    let cancelled = false;

    const syncWalletState = async () => {
      try {
        const [addr, capacity, client] = await Promise.all([
          signer.getRecommendedAddress(),
          signer.getBalance(),
          Promise.resolve(signer.client),
        ]);

        if (cancelled) {
          return;
        }

        setAddress(addr);
        setBalance(ccc.fixedPointToString(capacity));
        setNetwork(client.addressPrefix === "ckt" ? "CKB Testnet" : "CKB Mainnet");
        setError("");
      } catch (cause) {
        if (cancelled) {
          return;
        }

        setError(cause instanceof Error ? cause.message : "Failed to read wallet state.");
      }
    };

    void syncWalletState();

    return () => {
      cancelled = true;
    };
  }, [signer]);

  return (
    <div className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-strong)] p-5">
      <div className="flex flex-col gap-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.26em] text-[var(--accent)]">
              {t("wallet")}
            </p>
            <h2 className="mt-2 text-2xl font-semibold">{t("connectWalletTitle")}</h2>
          </div>
          {wallet ? (
            <div className="rounded-full bg-[rgba(23,32,51,0.08)] px-3 py-2 text-xs font-semibold text-[var(--muted)]">
              {wallet.name}
            </div>
          ) : null}
        </div>

        <p className="text-sm leading-6 text-[var(--muted)]">
          {t("walletDescription")}
        </p>

        <button
          type="button"
          className="flex h-14 items-center justify-center rounded-full bg-[var(--foreground)] px-5 text-sm font-semibold text-white transition hover:bg-[#2a3550]"
          onClick={open}
        >
          {wallet ? t("switchWallet") : t("connectWallet")}
        </button>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-[var(--border)] bg-white px-4 py-4">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Network</p>
            <p className="mt-2 text-sm font-semibold">{network}</p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-white px-4 py-4">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Address</p>
            <p className="mt-2 text-sm font-semibold">
              {address ? truncateAddress(address, 10, 6) : t("waitingConnection")}
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-white px-4 py-4">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Capacity</p>
            <p className="mt-2 text-sm font-semibold">
              {balance ? `${formatBalance(balance)} CKB` : t("waitingRead")}
            </p>
          </div>
        </div>

        {error ? (
          <p className="rounded-2xl bg-[rgba(190,24,93,0.08)] px-4 py-3 text-sm text-[#9f1239]">
            {t("walletReadFailed")}{error}
          </p>
        ) : null}
      </div>
    </div>
  );
};

export default ConnectWallet;
