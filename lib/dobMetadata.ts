import { DobMetadataDraft, StoredDobMetadata, UploadResult } from "@/types/mint";

type BuildDobMetadataInput = {
  name: string;
  upload?: UploadResult;
  externalUrl?: string;
};

export function buildDobMetadataDraft(input: BuildDobMetadataInput): DobMetadataDraft {
  const uri = input.upload?.uri ?? input.externalUrl ?? "";

  return {
    v: 0,
    n: input.name,
    r: uri,
    m: input.upload?.mimeType,
  };
}

export function getDobMetadataName(metadata: StoredDobMetadata) {
  return "n" in metadata ? metadata.n : metadata.name;
}

export function getDobMetadataUri(metadata: StoredDobMetadata) {
  return "r" in metadata ? metadata.r : metadata.resource.uri;
}

export function getDobMetadataMimeType(metadata: StoredDobMetadata) {
  return "n" in metadata ? metadata.m : metadata.resource.mimeType;
}

export function toDobMetadataDraft(metadata: StoredDobMetadata): DobMetadataDraft {
  if ("n" in metadata) {
    return metadata;
  }

  return {
    v: 0,
    n: metadata.name,
    r: metadata.resource.uri,
    m: metadata.resource.mimeType,
  };
}

export function hasUsableDobMetadata(value: unknown): value is StoredDobMetadata {
  if (!value || typeof value !== "object") {
    return false;
  }

  const metadata = value as Partial<DobMetadataDraft> & {
    standard?: string;
    name?: string;
    resource?: {
      uri?: string;
    };
  };

  const hasCompactFields =
    metadata.v === 0 && typeof metadata.n === "string" && typeof metadata.r === "string";
  const hasLegacyFields =
    metadata.standard === "dob/0" &&
    typeof metadata.name === "string" &&
    typeof metadata.resource?.uri === "string";

  return hasCompactFields || hasLegacyFields;
}
