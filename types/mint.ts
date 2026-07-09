export type StorageKind = "ipfs" | "native" | "centralized";

export type UploadStatus = "idle" | "ready" | "uploading" | "uploaded" | "failed";

export type MintStatus =
  | "idle"
  | "ready"
  | "building"
  | "awaiting_signature"
  | "submitted"
  | "simulated"
  | "failed";

export type StorageOption = {
  value: StorageKind;
  label: string;
  description: string;
};

export type UploadResult = {
  storage: "ipfs";
  cid: string;
  uri: string;
  gatewayUrl: string;
  name: string;
  size: number;
  mimeType: string;
};

export type DobMetadataDraft = {
  v: 0;
  n: string;
  r: string;
  m?: string;
};

export type LegacyDobMetadataDraft = {
  standard: "dob/0";
  name: string;
  description?: string;
  resource: {
    storage?: string;
    uri: string;
    mimeType?: string;
    size?: number;
  };
  traits?: Array<{
    key: string;
    value: string;
  }>;
  createdAt?: string;
};

export type StoredDobMetadata = DobMetadataDraft | LegacyDobMetadataDraft;

export type MintTransactionResult = {
  sporeId: string;
  txHash: string;
  contentType: string;
  contentBytes: number;
  mode: "real" | "dry_run";
};

export type MintHistoryItem = {
  id: string;
  createdAt: string;
  upload: UploadResult;
  metadata: StoredDobMetadata;
  mint?: MintTransactionResult;
};
