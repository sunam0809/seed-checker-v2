import { WalletInfo, maskMnemonic, truncateAddress } from '../lib/crypto';

interface WalletCardProps {
  wallet: WalletInfo;
  index: number;
}

export function WalletCard({ wallet, index }: WalletCardProps) {
  const hasBalance = wallet.hasBalance;
  const ethNum = parseFloat(wallet.ethBalance);
  const btcNum = parseFloat(wallet.btcBalance);
  const isZero = !wallet.isChecking && ethNum === 0 && btcNum === 0;

  return (
    <div
      className={`rounded-xl border p-4 transition-all duration-300 ${
        hasBalance
          ? 'border-emerald-500/60 bg-emerald-500/5 shadow-lg shadow-emerald-500/10'
          : isZero
          ? 'border-gray-700/40 bg-gray-800/30 opacity-60'
          : 'border-gray-700/60 bg-gray-800/50'
      }`}
    >
      <div className="flex items-start justify-between mb-3 gap-2">
        <span className="text-xs font-mono text-gray-500">#{index + 1}</span>
        {hasBalance && !wallet.isChecking && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            잔액 있음
          </span>
        )}
      </div>

      {/* Seed phrase */}
      <div className="mb-3">
        <p className="text-xs text-gray-500 mb-1">시드문구</p>
        <p className="font-mono text-sm text-gray-300 break-all leading-relaxed">
          {maskMnemonic(wallet.mnemonic)}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* ETH */}
        <div className="rounded-lg bg-gray-900/60 p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <div className="w-4 h-4 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center">
              <span className="text-[8px] font-bold text-indigo-400">Ξ</span>
            </div>
            <span className="text-xs text-gray-400 font-medium">이더리움</span>
          </div>
          <p className="text-xs text-gray-600 mb-0.5">주소</p>
          <p className="font-mono text-xs text-gray-400 truncate mb-2">
            {truncateAddress(wallet.ethAddress)}
          </p>
          <p className="text-xs text-gray-600 mb-0.5">잔액</p>
          {wallet.isChecking ? (
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 border-2 border-indigo-500/60 border-t-indigo-500 rounded-full animate-spin"></div>
              <span className="text-xs text-gray-500">조회 중...</span>
            </div>
          ) : (
            <p className={`font-mono text-sm font-semibold ${ethNum > 0 ? 'text-emerald-400' : 'text-gray-500'}`}>
              {ethNum.toFixed(6)} ETH
            </p>
          )}
        </div>

        {/* BTC */}
        <div className="rounded-lg bg-gray-900/60 p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <div className="w-4 h-4 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
              <span className="text-[8px] font-bold text-amber-400">₿</span>
            </div>
            <span className="text-xs text-gray-400 font-medium">비트코인</span>
          </div>
          <p className="text-xs text-gray-600 mb-0.5">주소</p>
          <p className="font-mono text-xs text-gray-400 truncate mb-2">
            {truncateAddress(wallet.btcAddress)}
          </p>
          <p className="text-xs text-gray-600 mb-0.5">잔액</p>
          {wallet.isChecking ? (
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 border-2 border-amber-500/60 border-t-amber-500 rounded-full animate-spin"></div>
              <span className="text-xs text-gray-500">조회 중...</span>
            </div>
          ) : (
            <p className={`font-mono text-sm font-semibold ${btcNum > 0 ? 'text-emerald-400' : 'text-gray-500'}`}>
              {wallet.btcBalance} BTC
            </p>
          )}
        </div>
      </div>

      {wallet.error && (
        <p className="mt-2 text-xs text-red-400 bg-red-500/10 rounded px-2 py-1">
          ⚠ {wallet.error}
        </p>
      )}
    </div>
  );
}
