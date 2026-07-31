import { mnemonicToSeedSync, validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
import { HDKey } from '@scure/bip32';
import { ethers } from 'ethers';

// ── bech32 helpers (inline, no extra dep) ────────────────────────────────────
const CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
const GENERATOR = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];

function bech32Polymod(values: number[]): number {
  let chk = 1;
  for (const v of values) {
    const top = chk >> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ v;
    for (let i = 0; i < 5; i++) if ((top >> i) & 1) chk ^= GENERATOR[i];
  }
  return chk;
}

function bech32HrpExpand(hrp: string): number[] {
  const result = [];
  for (let i = 0; i < hrp.length; i++) result.push(hrp.charCodeAt(i) >> 5);
  result.push(0);
  for (let i = 0; i < hrp.length; i++) result.push(hrp.charCodeAt(i) & 31);
  return result;
}

function bech32CreateChecksum(hrp: string, data: number[]): number[] {
  const values = bech32HrpExpand(hrp).concat(data).concat([0, 0, 0, 0, 0, 0]);
  const mod = bech32Polymod(values) ^ 1;
  return Array.from({ length: 6 }, (_, i) => (mod >> (5 * (5 - i))) & 31);
}

function convertBits(data: Uint8Array, fromBits: number, toBits: number, pad: boolean): number[] {
  let acc = 0, bits = 0;
  const result: number[] = [];
  const maxv = (1 << toBits) - 1;
  for (const value of data) {
    acc = (acc << fromBits) | value;
    bits += fromBits;
    while (bits >= toBits) {
      bits -= toBits;
      result.push((acc >> bits) & maxv);
    }
  }
  if (pad && bits > 0) result.push((acc << (toBits - bits)) & maxv);
  return result;
}

function encodeBech32(hrp: string, witnessVersion: number, data: Uint8Array): string {
  const converted = [witnessVersion].concat(convertBits(data, 8, 5, true));
  const checksum = bech32CreateChecksum(hrp, converted);
  return hrp + '1' + converted.concat(checksum).map(d => CHARSET[d]).join('');
}
// ─────────────────────────────────────────────────────────────────────────────

export interface WalletInfo {
  mnemonic: string;
  ethAddress: string;
  btcAddress: string;
  ethBalance: string;
  btcBalance: string;
  hasBalance: boolean;
  isChecking: boolean;
  error?: string;
}

export function extractSeedPhrases(text: string): string[] {
  const words = text
    .toLowerCase()
    .split(/[\s,;\n\r]+/)
    .filter((w) => w && wordlist.includes(w));

  const phrases: string[] = [];
  let i = 0;

  while (i < words.length && phrases.length < 200) {
    let foundPhrase = false;
    for (const len of [24, 12]) {
      if (i + len <= words.length) {
        const candidate = words.slice(i, i + len).join(' ');
        if (validateMnemonic(candidate, wordlist)) {
          phrases.push(candidate);
          i += len;
          foundPhrase = true;
          break;
        }
      }
    }
    if (!foundPhrase) i++;
  }

  return [...new Set(phrases)];
}

export function deriveEthAddress(mnemonic: string): string {
  const seed = mnemonicToSeedSync(mnemonic);
  const hdkey = HDKey.fromMasterSeed(seed);
  const child = hdkey.derive("m/44'/60'/0'/0/0");
  const pubkey = child.publicKey!;
  return ethers.computeAddress(pubkey);
}

export function deriveBtcAddress(mnemonic: string): string {
  const seed = mnemonicToSeedSync(mnemonic);
  const hdkey = HDKey.fromMasterSeed(seed);
  const child = hdkey.derive("m/84'/0'/0'/0/0");
  const pubkey = child.publicKey!;

  const sha256Hex = ethers.sha256(pubkey);
  const hash160Hex = ethers.ripemd160(sha256Hex);
  const hash160Bytes = ethers.getBytes(hash160Hex);

  return encodeBech32('bc', 0, hash160Bytes);
}

export async function getEthBalance(address: string): Promise<string> {
  const res = await fetch('https://rpc.ankr.com/eth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_getBalance',
      params: [address, 'latest'],
      id: 1,
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  const wei = BigInt(data.result);
  return ethers.formatEther(wei);
}

export async function getBtcBalance(address: string): Promise<string> {
  const res = await fetch(`https://mempool.space/api/address/${address}`);
  if (!res.ok) throw new Error(`BTC API 오류: ${res.status}`);
  const data = await res.json();
  const funded: number = data.chain_stats.funded_txo_sum;
  const spent: number = data.chain_stats.spent_txo_sum;
  const satoshis = funded - spent;
  return (satoshis / 1e8).toFixed(8);
}

export function maskMnemonic(mnemonic: string): string {
  const words = mnemonic.split(' ');
  if (words.length < 6) return mnemonic;
  const first = words.slice(0, 3).join(' ');
  const last = words.slice(-3).join(' ');
  return `${first} ... ${last}`;
}

export function truncateAddress(address: string): string {
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
}
