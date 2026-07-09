type JsonRpcResponse<T> = {
  jsonrpc: "2.0";
  id: number;
  result?: T;
  error?: {
    code: number;
    message: string;
  };
};

type RpcScript = {
  code_hash: string;
  hash_type: "data" | "type" | "data1";
  args: string;
};

type RpcCellOutput = {
  capacity: string;
  lock: RpcScript;
  type?: RpcScript | null;
};

type RpcLiveCellOutput = {
  output: RpcCellOutput;
  output_data: string;
};

type RpcTransactionView = {
  transaction: {
    hash: string;
    version: string;
    cell_deps: Array<unknown>;
    header_deps: Array<string>;
    inputs: Array<unknown>;
    outputs: Array<RpcCellOutput>;
    outputs_data: Array<string>;
    witnesses: Array<string>;
  };
  tx_status: {
    status: string;
    block_hash?: string;
  };
};

export type RpcTxSummary = {
  txHash: string;
  status: string;
  blockHash?: string;
  outputCount: number;
  firstOutput?: RpcCellOutput;
  firstOutputData?: string;
};

const DEFAULT_RPC_URL = "https://testnet.ckb.dev/rpc";

async function ckbRpcRequest<T>(method: string, params: Array<unknown> = [], rpcUrl = DEFAULT_RPC_URL) {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: 1,
      jsonrpc: "2.0",
      method,
      params,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`CKB RPC request failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as JsonRpcResponse<T>;
  if (payload.error) {
    throw new Error(payload.error.message);
  }

  if (payload.result === undefined) {
    throw new Error("CKB RPC returned an empty result.");
  }

  return payload.result;
}

export async function fetchTxSummary(txHash: string, rpcUrl?: string): Promise<RpcTxSummary> {
  const transaction = await ckbRpcRequest<RpcTransactionView>("get_transaction", [txHash], rpcUrl);

  return {
    txHash: transaction.transaction.hash,
    status: transaction.tx_status.status,
    blockHash: transaction.tx_status.block_hash,
    outputCount: transaction.transaction.outputs.length,
    firstOutput: transaction.transaction.outputs[0],
    firstOutputData: transaction.transaction.outputs_data[0],
  };
}

export async function fetchLiveCell(txHash: string, index: number, rpcUrl?: string) {
  return ckbRpcRequest<RpcLiveCellOutput>("get_live_cell", [{ tx_hash: txHash, index: `0x${index.toString(16)}` }, false], rpcUrl);
}
