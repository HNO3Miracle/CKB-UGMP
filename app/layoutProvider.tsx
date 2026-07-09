"use client";

import { ccc } from "@ckb-ccc/connector-react";
import { CSSProperties } from "react";
import React from "react";
import { I18nProvider } from "@/lib/i18n";

export function LayoutProvider({ children }: { children: React.ReactNode }) {
    const defaultClient = React.useMemo(() => {
        return process.env.NEXT_PUBLIC_IS_MAINNET === "true"
            ? new ccc.ClientPublicMainnet()
            : new ccc.ClientPublicTestnet();
    }, []);

    return (
        <I18nProvider>
            <ccc.Provider
                connectorProps={{
                    style: {
                        "--background": "#0f172a",
                        "--divider": "rgba(148, 163, 184, 0.24)",
                        "--btn-primary": "#2f7d6d",
                        "--btn-primary-hover": "#1f5f53",
                        "--btn-secondary": "#1e293b",
                        "--btn-secondary-hover": "#334155",
                        "--icon-primary": "#f8fafc",
                        "--icon-secondary": "rgba(226, 232, 240, 0.72)",
                        color: "#f8fafc",
                        "--tip-color": "#94a3b8",
                    } as CSSProperties,
                }}
                defaultClient={defaultClient}
                clientOptions={[
                    {
                        name: "CKB Testnet",
                        client: new ccc.ClientPublicTestnet(),
                    },
                    {
                        name: "CKB Mainnet",
                        client: new ccc.ClientPublicMainnet(),
                    },
                ]}
            >
                {children}
            </ccc.Provider>
        </I18nProvider>
    );
}
