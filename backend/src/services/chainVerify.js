import { prisma } from '../prismaClient.js';
import { notifyPurchaseConfirmed } from './notify.js';

const USDT_TRC20_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
const USDT_ETH_CONTRACT = '0xdAC17F958D2ee523a2206206994597C13D831ec';
const USDT_POLYGON_CONTRACT = '0xc2132D05D31c914a87C6611C10748AEb04B58e8f';

export const NETWORKS = {
  trc20: { label: 'USDT · TRC20 (Tron)', short: 'TRC20' },
  eth: { label: 'USDT · Ethereum (ERC20)', short: 'Ethereum', chainId: 1, contract: USDT_ETH_CONTRACT },
  polygon: { label: 'USDT · Polygon', short: 'Polygon', chainId: 137, contract: USDT_POLYGON_CONTRACT },
};

async function fetchTrc20Transfers(address) {
  const url = `https://api.trongrid.io/v1/accounts/${address}/transactions/trc20?limit=50&contract_address=${USDT_TRC20_CONTRACT}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('No se pudo consultar la red TRC20');
  const json = await res.json();
  return (json.data || []).map((t) => ({
    to: t.to,
    valueMicro: Number(t.value),
    timestampMs: t.block_timestamp,
    txHash: t.transaction_id,
  }));
}

async function fetchEvmTransfers(chainId, contract, address, apiKey) {
  const url = `https://api.etherscan.io/v2/api?chainid=${chainId}&module=account&action=tokentx&address=${address}&contractaddress=${contract}&sort=desc&apikey=${apiKey}`;
  const res = await fetch(url);
  const json = await res.json().catch(() => null);
  if (!json) throw new Error('Respuesta inválida de Etherscan');
  if (json.status === '0' && json.message !== 'No transactions found') {
    throw new Error(json.result || json.message || 'Error de Etherscan');
  }
  const rows = Array.isArray(json.result) ? json.result : [];
  return rows.map((r) => ({
    to: String(r.to || '').toLowerCase(),
    valueMicro: Number(r.value),
    timestampMs: Number(r.timeStamp) * 1000,
    txHash: r.hash,
  }));
}

function findMatch(transfers, toAddress, uniqueAmountMicro, sinceMs) {
  return transfers.find((t) => {
    if (t.to !== toAddress) return false;
    if (t.valueMicro !== uniqueAmountMicro) return false;
    if (t.timestampMs < sinceMs - 2 * 60000) return false;
    return true;
  });
}

// Verifica una compra puntual contra la red correspondiente y, si encuentra
// el pago, la marca como confirmada. `etherscanKey` viene del organizador
// dueño del torneo y nunca sale de este proceso del servidor.
export async function verifyPurchase(purchase, etherscanKey) {
  const net = purchase.network || 'trc20';
  let transfers;
  let toAddr = purchase.walletAddress;

  if (net === 'trc20') {
    transfers = await fetchTrc20Transfers(purchase.walletAddress);
  } else {
    const cfg = NETWORKS[net];
    if (!cfg || !cfg.chainId) throw new Error('Red no reconocida');
    if (!etherscanKey) throw new Error('Falta configurar la clave de Etherscan');
    toAddr = String(purchase.walletAddress || '').toLowerCase();
    transfers = await fetchEvmTransfers(cfg.chainId, cfg.contract, purchase.walletAddress, etherscanKey);
  }

  const match = findMatch(transfers, toAddr, purchase.uniqueAmountMicro, new Date(purchase.createdAt).getTime());
  if (!match) return null;

  const updated = await prisma.purchase.update({
    where: { id: purchase.id },
    data: { status: 'confirmado', txHash: match.txHash, lastVerifyAt: new Date() },
  });
  const productName = purchase.package?.name || purchase.tournament?.name;
  notifyPurchaseConfirmed(updated, productName).catch((err) => console.error('[notify] error:', err.message));
  return updated;
}

export async function testEtherscanKey(etherscanKey) {
  const url = `https://api.etherscan.io/v2/api?chainid=1&module=stats&action=ethprice&apikey=${etherscanKey}`;
  const res = await fetch(url);
  const json = await res.json().catch(() => null);
  if (!res.ok || !json || json.status === '0') {
    throw new Error((json && json.message) || `Etherscan respondió ${res.status}`);
  }
  return json.result;
}
