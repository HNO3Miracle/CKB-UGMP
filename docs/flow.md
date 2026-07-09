# CKB-UGMP Flow Notes

This document describes the current prototype flow and the boundaries of the public repository.

## 1. Wallet Connection

The app uses `@ckb-ccc/connector-react` as the wallet connector layer.

- The provider is configured in `app/layoutProvider.tsx`.
- The wallet panel is implemented in `components/ConnectWallet.tsx`.
- Testnet is used by default unless `NEXT_PUBLIC_IS_MAINNET=true` is configured.

## 2. Asset Upload

The MVP accepts image files and uploads them through a server-side API route.

- Frontend form: `components/MintWorkbench.tsx`
- API route: `app/api/uploads/pinata/route.ts`
- Pinata wrapper: `lib/pinata.ts`

The upload API validates:

- `multipart/form-data` request body
- image MIME type
- max file size of 10 MB

`PINATA_JWT` is read only on the server side and must not be exposed with a `NEXT_PUBLIC_` prefix.

See `docs/ipfs-spore-storage.md` for the detailed IPFS / Pinata upload flow and storage tradeoff rationale.

## 3. DOB Metadata Draft

After upload, the app builds a DOB metadata draft in `lib/dobMetadata.ts`.

The current on-chain draft is intentionally compact:

- `v`: metadata schema version
- `n`: display name
- `r`: resource URI, usually `ipfs://...`
- `m`: MIME type

The image bytes stay on IPFS. The Spore content only stores the JSON reference above. Older local history records using the long `dob/0` JSON shape are still readable in the UI, but restored records are normalized to the compact shape before minting.

The same storage note also explains why some DOBs render images successfully while others require renderer or gateway fallback handling.

## 4. Spore Mint Path

The Spore transaction path is implemented in `lib/sporeMint.ts`.

The real mint path:

1. Encodes the DOB metadata as JSON bytes.
2. Calls `createSpore`.
3. Sends the transaction through the connected signer.
4. Returns Spore ID, tx hash, content type, and content size.

The dry-run path:

1. Encodes the same metadata.
2. Derives deterministic local IDs from the metadata hash.
3. Saves the result to browser history.
4. Does not request wallet signature and does not write to CKB.

Dry-run records are explicitly marked as local simulation results.

## 5. Local History And Lookup

The workbench stores recent upload and mint records in browser `localStorage`.

Current history features:

- restore a previous record
- filter uploaded, dry-run, and real mint records
- export history as JSON
- import exported history JSON
- search local records by CID, IPFS URI, Spore ID, or tx hash
- open CKB testnet explorer for real-format tx hashes

## 6. Chain Query

The gallery page now performs a direct CKB testnet RPC lookup when the search input is a valid tx hash.

- RPC endpoint: `https://testnet.ckb.dev/rpc`
- Queried methods: `get_transaction`
- Current use: surface chain status and first output details in the gallery

This keeps the gallery as an asset hub rather than a pure browser-history view.

## 7. Current Limitations

- On-chain Spore/DOB querying is not implemented yet.
- Real mint depends on a working wallet signing environment.
- Dry-run IDs are deterministic local simulation results, not on-chain transactions.

## 8. Useful Commands

```bash
npm install
npm run dev
npm run lint
npm run build
```
