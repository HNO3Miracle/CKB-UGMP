import { UploadResult } from "@/types/mint";

type PinataPinFileResponse = {
  IpfsHash?: string;
  PinSize?: number;
  Timestamp?: string;
};

export class UploadConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UploadConfigurationError";
  }
}

export class UploadProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UploadProviderError";
  }
}

export async function uploadFileToPinata(file: File): Promise<UploadResult> {
  const jwt = process.env.PINATA_JWT;

  if (!jwt) {
    throw new UploadConfigurationError("Missing PINATA_JWT in the server environment.");
  }

  const formData = new FormData();
  formData.append("file", file, file.name);
  formData.append(
    "pinataMetadata",
    JSON.stringify({
      name: file.name,
      keyvalues: {
        app: "ckb-ugmp",
        phase: "week-2",
      },
    }),
  );

  const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new UploadProviderError(`Pinata upload failed with ${response.status}: ${detail}`);
  }

  const payload = (await response.json()) as PinataPinFileResponse;
  const cid = payload.IpfsHash;

  if (!cid) {
    throw new UploadProviderError("Pinata response did not include IpfsHash.");
  }

  const gatewayHost = process.env.PINATA_GATEWAY_HOST ?? "gateway.pinata.cloud";
  const gatewayUrl = `https://${gatewayHost}/ipfs/${cid}`;

  return {
    storage: "ipfs",
    cid,
    uri: `ipfs://${cid}`,
    gatewayUrl,
    name: file.name,
    size: file.size,
    mimeType: file.type || "application/octet-stream",
  };
}
