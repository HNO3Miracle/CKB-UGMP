"use client";

import { ccc } from "@ckb-ccc/connector-react";
import { createSpore } from "@ckb-ccc/spore";
import { DobMetadataDraft, MintTransactionResult } from "@/types/mint";

const DOB_METADATA_CONTENT_TYPE = "application/json;dob=0";
const DEFAULT_FEE_RATE = 1000;

export function encodeDobMetadataContent(metadata: DobMetadataDraft): Uint8Array {
  return ccc.bytesFrom(JSON.stringify(metadata), "utf8");
}

export async function mintSporeFromMetadata(params: {
  signer: ccc.Signer;
  metadata: DobMetadataDraft;
  onProgress?: (message: string) => void;
}): Promise<MintTransactionResult> {
  const content = encodeDobMetadataContent(params.metadata);
  params.onProgress?.("building spore transaction");
  const { tx, id } = await createSpore({
    signer: params.signer,
    data: {
      contentType: DOB_METADATA_CONTENT_TYPE,
      content,
    },
    clusterMode: "skip",
  });

  params.onProgress?.("completing transaction fee");
  await tx.completeFeeBy(params.signer, DEFAULT_FEE_RATE);
  params.onProgress?.("waiting for wallet signature and broadcast");
  const txHash = await params.signer.sendTransaction(tx);

  return {
    sporeId: id,
    txHash,
    contentType: DOB_METADATA_CONTENT_TYPE,
    contentBytes: content.byteLength,
    mode: "real",
  };
}

export function simulateSporeMintFromMetadata(metadata: DobMetadataDraft): MintTransactionResult {
  const content = encodeDobMetadataContent(metadata);
  const digest = ccc.hashCkb(content);

  return {
    sporeId: digest,
    txHash: ccc.hashCkb(ccc.bytesFrom(`dry-run:${digest}`, "utf8")),
    contentType: DOB_METADATA_CONTENT_TYPE,
    contentBytes: content.byteLength,
    mode: "dry_run",
  };
}
