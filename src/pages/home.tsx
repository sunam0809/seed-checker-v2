import { useState, useRef, useCallback } from 'react';
import {
  extractSeedPhrases,
  deriveEthAddress,
  deriveBtcAddress,
  getEthBalance,
  getBtcBalance,
  WalletInfo,
} from '../lib/crypto';
import { WalletCard } from '../components/wallet-card';

function GuideModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 border border-gray-700 rounded-xl p-6 max-w-lg w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">시드문구 입력 안내</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-xl leading-none"
          >
            ✕
          </button>
        </div>
        <div className="space-y-4 text-sm">
          <div>
            <p className="font-semibold text-indigo-400 mb-1">지원 형식</p>
            <p className="text-gray-300">
              BIP39 영어 단어로 이루어진{' '}
              <strong className="text-white">12단어 또는 24단어</strong> 조합입니다.
              메타마스크, 트러스트월렛, 렛저 등에서 백업한 시드문구를 입력하세요.
            </p>
          </div>
          <div>
            <p className="font-semibold text-indigo-400 mb-2">입력 예시</p>
            <div className="bg-gray-900 rounded-lg p-3 font-mono text-xs space-y-2">
              <p className="text-gray-500">— 12단어 예시</p>
              <p className="text-gray-300">abandon ability able about above absent absorb abstract absurd abuse access accident</p>
              <p className="text-gray-500 mt-2">— 여러 개를 한 번에 붙여넣기 (자동 분리됨)</p>
              <p className="text-gray-300 break-all">abandon ability able about above absent absorb abstract absurd abuse access accident basket battle beach become before begin behave behind below benefit best betray</p>
            </div>
          </div>
          <div>
            <p className="font-semibold text-indigo-400 mb-1">주의사항</p>
            <ul className="text-gray-400 space-y-1 list-disc list-inside">
              <li>반드시 <strong className="text-gray-200">영어 소문자</strong> 단어여야 합니다</li>
              <li>한국어 시드문구는 지원하지 않습니다 (BIP39 표준)</li>
              <li>숫자, 특수문자는 자동으로 무시됩니다</li>
              <li>최대 <strong className="text-gray-200">200개</strong>까지 동시 검색 가능합니다</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [inputText, setInputText] = useState('');
  const [wallets, setWallets] = useState<WalletInfo[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [detectedCount, setDetectedCount] = useState(0);
  const [showGuide, setShowGuide] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const abortRef = useRef<{ aborted: boolean }>({ aborted: false });

  const handleCheck = useCallback(async () => {
    if (!inputText.trim()) return;
    setErrorMsg('');

    let phrases: string[] = [];
    try {
      phrases = extractSeedPhrases(inputText);
    } catch (e) {
      setErrorMsg('시드문구 파싱 오류: ' + String(e));
      return;
    }

    setDetectedCount(phrases.length);

    if (phrases.length === 0) {
      setErrorMsg(
        '유효한 BIP39 시드문구를 찾지 못했습니다. 영어 소문자 12단어 또는 24단어를 입력해 주세요.'
      );
      return;
    }

    abortRef.current = { aborted: false };

    // Derive addresses first — wrap in try-catch
    const initialWallets: WalletInfo[] = [];
    for (const mnemonic of phrases) {
      try {
        const ethAddress = deriveEthAddress(mnemonic);
        const btcAddress = deriveBtcAddress(mnemonic);
        initialWallets.push({
          mnemonic,
          ethAddress,
          btcAddress,
          ethBalance: '0.000000',
          btcBalance: '0.00000000',
          hasBalance: false,
          isChecking: true,
        });
      } catch (e) {
        initialWallets.push({
          mnemonic,
          ethAddress: 'error',
          btcAddress: 'error',
          ethBalance: '0.000000',
          btcBalance: '0.00000000',
          hasBalance: false,
          isChecking: false,
          error: '주소 파생 실패: ' + String(e),
        });
      }
    }

    setWallets(initialWallets);
    setIsProcessing(true);
    setProgress(0);

    const BATCH = 3;
    const updated = [...initialWallets];

    try {
      for (let i = 0; i < initialWallets.length; i += BATCH) {
        if (abortRef.current.aborted) break;

        const batchItems = initialWallets.slice(i, i + BATCH);
        await Promise.all(
          batchItems.map(async (wallet, batchIdx) => {
            const globalIdx = i + batchIdx;
            if (wallet.error) return; // skip already-errored
            try {
              const [eth, btc] = await Promise.all([
                getEthBalance(wallet.ethAddress),
                getBtcBalance(wallet.btcAddress),
              ]);
              updated[globalIdx] = {
                ...updated[globalIdx],
                ethBalance: eth,
                btcBalance: btc,
                hasBalance: parseFloat(eth) > 0 || parseFloat(btc) > 0,
                isChecking: false,
              };
            } catch (err) {
              updated[globalIdx] = {
                ...updated[globalIdx],
                isChecking: false,
                error: err instanceof Error ? err.message : '잔액 조회 실패',
              };
            }
          })
        );

        const done = Math.min(i + BATCH, initialWallets.length);
        setProgress((done / initialWallets.length) * 100);
        setWallets([...updated]);

        // Small delay between batches to avoid rate limiting
        if (i + BATCH < initialWallets.length) {
          await new Promise((r) => setTimeout(r, 300));
        }
      }
    } finally {
      setIsProcessing(false);
    }
  }, [inputText]);

  const handleStop = () => {
    abortRef.current.aborted = true;
    setIsProcessing(false);
    setWallets((prev) =>
      prev.map((w) =>
        w.isChecking ? { ...w, isChecking: false, error: '사용자가 중단함' } : w
      )
    );
  };

  const handleReset = () => {
    abortRef.current.aborted = true;
    setWallets([]);
    setInputText('');
    setProgress(0);
    setDetectedCount(0);
    setIsProcessing(false);
    setErrorMsg('');
  };

  const walletsWithBalance = wallets.filter((w) => w.hasBalance).length;
  const sortedWallets = [...wallets].sort(
    (a, b) => (b.hasBalance ? 1 : 0) - (a.hasBalance ? 1 : 0)
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#1c1e26' }}>
      {showGuide && <GuideModal onClose={() => setShowGuide(false)} />}

      <div className="max-w-2xl mx-auto px-4 py-8 pb-16">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 tracking-tight">
            🔍 시드문구 잔액 조회기
          </h1>
          <p className="text-gray-400 text-sm">
            BIP39 시드문구의 ETH · BTC 잔액을 조회합니다 &nbsp;·&nbsp; 최대 200개 동시 검색
          </p>
        </div>

        {/* Input area */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-300">시드문구 입력</label>
            <button
              onClick={() => setShowGuide(true)}
              className="text-xs text-gray-500 hover:text-indigo-400 transition-colors"
            >
              ? 입력 안내
            </button>
          </div>
          <textarea
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              setErrorMsg('');
            }}
            placeholder={'시드문구를 여기에 붙여넣으세요.\n여러 개를 한 번에 입력해도 자동으로 분리됩니다.\n\n예) abandon ability able about above absent absorb abstract absurd abuse access accident'}
            className="w-full h-40 rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-sm font-mono text-gray-200 placeholder-gray-600 resize-none focus:outline-none focus:border-indigo-500 transition-all"
            style={{ fontFamily: 'JetBrains Mono, Menlo, monospace' }}
            disabled={isProcessing}
          />
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            ⚠ {errorMsg}
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3 mb-6">
          {!isProcessing ? (
            <>
              <button
                onClick={handleCheck}
                disabled={!inputText.trim()}
                className="flex-1 rounded-xl font-semibold py-3 text-sm transition-all active:scale-95 text-white"
                style={{
                  backgroundColor: inputText.trim() ? '#4f46e5' : '#374151',
                  cursor: inputText.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                잔액 조회 시작
              </button>
              {wallets.length > 0 && (
                <button
                  onClick={handleReset}
                  className="px-4 rounded-xl border border-gray-700 hover:border-gray-600 text-gray-400 hover:text-gray-200 text-sm transition-all"
                >
                  초기화
                </button>
              )}
            </>
          ) : (
            <button
              onClick={handleStop}
              className="flex-1 rounded-xl text-white font-semibold py-3 text-sm transition-all active:scale-95 flex items-center justify-center gap-2"
              style={{ backgroundColor: '#dc2626' }}
            >
              <span
                className="inline-block w-3.5 h-3.5 border-2 border-white/60 border-t-white rounded-full"
                style={{ animation: 'spin 1s linear infinite' }}
              />
              조회 중단
            </button>
          )}
        </div>

        {/* Progress */}
        {isProcessing && (
          <div className="mb-6">
            <div className="flex justify-between text-xs mb-2">
              <span className="text-gray-400">
                잔액 조회 중... ({detectedCount}개 시드문구)
              </span>
              <span className="text-indigo-400" style={{ fontFamily: 'monospace' }}>
                {Math.round(progress)}%
              </span>
            </div>
            <div
              className="w-full h-2 rounded-full"
              style={{ backgroundColor: '#1f2937' }}
            >
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${progress}%`, backgroundColor: '#4f46e5' }}
              />
            </div>
          </div>
        )}

        {/* Summary */}
        {wallets.length > 0 && !isProcessing && (
          <div
            className="mb-6 rounded-xl border px-4 py-4 text-center"
            style={{ borderColor: '#374151', backgroundColor: 'rgba(31,41,55,0.5)' }}
          >
            <span className="text-white font-semibold text-lg">{wallets.length}개</span>
            <span className="text-gray-400 mx-2">조회 완료 —</span>
            <span
              className="font-bold text-lg"
              style={{ color: walletsWithBalance > 0 ? '#34d399' : '#6b7280' }}
            >
              {walletsWithBalance}개
            </span>
            <span className="text-gray-400 ml-2">에 잔액 있음</span>
            {walletsWithBalance > 0 && (
              <p className="text-xs mt-1" style={{ color: '#6ee7b7' }}>
                ↑ 잔액이 있는 지갑이 먼저 표시됩니다
              </p>
            )}
          </div>
        )}

        {/* Results */}
        {sortedWallets.length > 0 && (
          <div className="space-y-3">
            {sortedWallets.map((wallet, index) => (
              <WalletCard
                key={`${wallet.mnemonic}-${index}`}
                wallet={wallet}
                index={index}
              />
            ))}
          </div>
        )}
      </div>

      {/* Spinner keyframes */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Footer */}
      <div
        className="fixed bottom-4 right-4 text-xs pointer-events-none"
        style={{ color: '#4b5563', fontFamily: 'monospace' }}
      >
        Made By PINALO
      </div>
    </div>
  );
}
