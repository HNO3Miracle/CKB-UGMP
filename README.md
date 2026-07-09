# CKB-UGMP

CKB-UGMP is a prototype for a universal Spore / DOB minting workflow on CKB.

The current MVP focuses on image asset upload, DOB metadata drafting, Spore mint transaction construction, dry-run progress saving, and local history lookup.

## Features

- Next.js 14 + TypeScript frontend
- CCC wallet connector integration
- CKB testnet by default
- Server-side Pinata/IPFS upload API
- DOB metadata draft generation
- Spore `createSpore` mint path
- Dry-run mint path for environments where wallet signing is blocked
- Local browser history for upload and mint records
- History export/import
- Local lookup by CID, IPFS URI, Spore ID, or tx hash
- Health check route at `/api/health`
- Chinese / English UI toggle with local preference persistence

## Project Structure

```text
app/                         Next.js app router pages and API routes
components/                  Wallet and mint workbench components
lib/                         Pinata, DOB metadata, and Spore mint helpers
types/                       Shared TypeScript types
docs/flow.md                 Key prototype flow notes
```

## Local Development

```bash
npm install
npm run dev
```

Then open:

```text
http://localhost:3000
```

For LAN testing:

```bash
npm run dev:lan
```

## Environment Variables

Copy `.env.example` to `.env.local` and fill in the required values:

```bash
cp .env.example .env.local
```

```bash
NEXT_PUBLIC_IS_MAINNET=false
PINATA_JWT=
PINATA_GATEWAY_HOST=gateway.pinata.cloud
```

`PINATA_JWT` is required for real IPFS uploads. Keep it server-side only. Do not expose it with a `NEXT_PUBLIC_` prefix.

## Verification

```bash
npm run lint
npm run build
```

## Docker

```bash
docker build -t ckb-ugmp:latest .
docker run --rm \
  --env-file .env.local \
  -p 3000:3000 \
  ckb-ugmp:latest
```

## Current Limitations

- On-chain Spore/DOB querying is not implemented yet.
- Real mint requires a wallet environment that can complete CKB testnet transaction signing.
- Dry-run records are local simulation records and are not CKB on-chain transactions.

See [docs/flow.md](docs/flow.md) for the current prototype flow.

For the IPFS / Spore DOB storage design, including Pinata upload, CID metadata mapping, storage tradeoffs, and image rendering differences, see [docs/ipfs-spore-storage.md](docs/ipfs-spore-storage.md).
