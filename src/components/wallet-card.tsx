import { WalletInfo, maskMnemonic, truncateAddress } from '../lib/crypto';

interface WalletCardProps {
  wallet: WalletInfo;
  index: number;
}

export function WalletCard({ wallet, index }: WalletCardProps) {
  const hasBalance = wallet.hasBalance;
  const ethNum = parseFloat(wallet.ethBalance) || 0;
  const btcNum = parseFloat(wallet.btcBalance) || 0;
  const isZero = !wallet.isChecking && !wallet.error && ethNum === 0 && btcNum === 0;

  const cardBorder = hasBalance
    ? '1px solid rgba(52,211,153,0.5)'
    : isZero
    ? '1px solid rgba(55,65,81,0.4)'
    : '1px solid rgba(55,65,81,0.7)';

  const cardBg = hasBalance
    ? 'rgba(16,185,129,0.05)'
    : isZero
    ? 'rgba(17,24,39,0.4)'
    : 'rgba(17,24,39,0.6)';

  return (
    <div
      className="rounded-xl p-4 transition-all duration-300"
      style={{
        border: cardBorder,
        backgroundColor: cardBg,
        opacity: isZero ? 0.65 : 1,
      }}
    >
      {/* Top row */}
      <div className="flex items-start justify-between mb-3 gap-2">
        <span className="text-xs text-gray-600" style={{ fontFamily: 'monospace' }}>
          #{index + 1}
        </span>
        {hasBalance && !wallet.isChecking && (
          <span
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold"
            style={{
              background: 'rgba(52,211,153,0.15)',
              border: '1px solid rgba(52,211,153,0.3)',
              color: '#34d399',
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                backgroundColor: '#34d399',
                animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite',
              }}
            />
            잔액 있음
          </span>
        )}
      </div>

      {/* Seed phrase */}
      <div className="mb-3">
        <p className="text-xs text-gray-500 mb-1">시드문구</p>
        <p
          className="text-sm text-gray-300 break-all leading-relaxed"
          style={{ fontFamily: 'JetBrains Mono, Menlo, monospace' }}
        >
          {maskMnemonic(wallet.mnemonic)}
        </p>
      </div>

      {/* ETH + BTC grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* ETH */}
        <div
          className="rounded-lg p-3"
          style={{ backgroundColor: 'rgba(17,24,39,0.7)' }}
        >
          <div className="flex items-center gap-1.5 mb-2">
            <div
              className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
              style={{
                background: 'rgba(99,102,241,0.2)',
                border: '1px solid rgba(99,102,241,0.4)',
                color: '#818cf8',
              }}
            >
              Ξ
            </div>
            <span className="text-xs text-gray-400 font-medium">이더리움</span>
          </div>
          <p className="text-xs text-gray-600 mb-0.5">주소</p>
          <p
            className="text-xs text-gray-400 truncate mb-2"
            style={{ fontFamily: 'monospace' }}
          >
            {truncateAddress(wallet.ethAddress)}
          </p>
          <p className="text-xs text-gray-600 mb-0.5">잔액</p>
          {wallet.isChecking ? (
            <div className="flex items-center gap-1.5">
              <span
                className="inline-block w-3 h-3 rounded-full border-2"
                style={{
                  borderColor: 'rgba(99,102,241,0.4)',
                  borderTopColor: '#818cf8',
                  animation: 'spin 1s linear infinite',
                }}
              />
              <span className="text-xs text-gray-500">조회 중...</span>
            </div>
          ) : (
            <p
              className="text-sm font-semibold"
              style={{
                fontFamily: 'monospace',
                color: ethNum > 0 ? '#34d399' : '#6b7280',
              }}
            >
              {ethNum.toFixed(6)} ETH
            </p>
          )}
        </div>

        {/* BTC */}
        <div
          className="rounded-lg p-3"
          style={{ backgroundColor: 'rgba(17,24,39,0.7)' }}
        >
          <div className="flex items-center gap-1.5 mb-2">
            <div
              className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
              style={{
                background: 'rgba(245,158,11,0.2)',
                border: '1px solid rgba(245,158,11,0.4)',
                color: '#fbbf24',
              }}
            >
              ₿
            </div>
            <span className="text-xs text-gray-400 font-medium">비트코인</span>
          </div>
          <p className="text-xs text-gray-600 mb-0.5">주소</p>
          <p
            className="text-xs text-gray-400 truncate mb-2"
            style={{ fontFamily: 'monospace' }}
          >
            {truncateAddress(wallet.btcAddress)}
          </p>
          <p className="text-xs text-gray-600 mb-0.5">잔액</p>
          {wallet.isChecking ? (
            <div className="flex items-center gap-1.5">
              <span
                className="inline-block w-3 h-3 rounded-full border-2"
                style={{
                  borderColor: 'rgba(245,158,11,0.4)',
                  borderTopColor: '#fbbf24',
                  animation: 'spin 1s linear infinite',
                }}
              />
              <span className="text-xs text-gray-500">조회 중...</span>
            </div>
          ) : (
            <p
              className="text-sm font-semibold"
              style={{
                fontFamily: 'monospace',
                color: btcNum > 0 ? '#34d399' : '#6b7280',
              }}
            >
              {wallet.btcBalance} BTC
            </p>
          )}
        </div>
      </div>

      {/* Error */}
      {wallet.error && (
        <div
          className="mt-2 text-xs rounded px-2 py-1"
          style={{ color: '#f87171', background: 'rgba(239,68,68,0.1)' }}
        >
          ⚠ {wallet.error}
        </div>
      )}
    </div>
  );
}
