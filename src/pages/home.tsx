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
              <p className="text-gray-500">— 한 줄씩 입력</p>
              <p className="text-gray-300">word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12</p>
              <p className="text-gray-500 mt-2">— 여러 개를 한 번에 붙여넣기 (자동 분리됨)</p>
              <p className="text-gray-300 break-all">abandon ability able about above absent absorb abstract ...</p>
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
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleCheck = useCallback(async () => {
    if (!inputText.trim()) return;

    const phrases = extractSeedPhrases(inputText);
    setDetectedCount(phrases.length);

    if (phrases.length === 0) {
      alert('유효한 시드문구를 찾을 수 없습니다. 입력 안내를 확인해 주세요.');
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const initialWallets: WalletInfo[] = phrases.map((mnemonic) => ({
      mnemonic,
      ethAddress: deriveEthAddress(mnemonic),
      btcAddress: deriveBtcAddress(mnemonic),
      ethBalance: '0.000000',
      btcBalance: '0.00000000',
      hasBalance: false,
      isChecking: true,
    }));

    setWallets(initialWallets);
    setIsProcessing(true);
    setProgress(0);

    const BATCH = 5;
    const updated = [...initialWallets];

    for (let i = 0; i < phrases.length; i += BATCH) {
      if (abortControllerRef.current?.signal.aborted) break;

      const batch = phrases.slice(i, i + BATCH);
      await Promise.all(
        batch.map(async (mnemonic, batchIdx) => {
          const globalIdx = i + batchIdx;
          try {
            const [eth, btc] = await Promise.all([
              getEthBalance(updated[globalIdx].ethAddress),
              getBtcBalance(updated[globalIdx].btcAddress),
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
              error: err instanceof Error ? err.message : '조회 실패',
            };
          }
        })
      );

      const done = Math.min(i + BATCH, phrases.length);
      setProgress((done / phrases.length) * 100);
      setWallets([...updated]);
    }

    setIsProcessing(false);
  }, [inputText]);

  const handleStop = () => {
    abortControllerRef.current?.abort();
    setIsProcessing(false);
    setWallets((prev) =>
      prev.map((w) => (w.isChecking ? { ...w, isChecking: false, error: '중단됨' } : w))
    );
  };

  const handleReset = () => {
    abortControllerRef.current?.abort();
    setWallets([]);
    setInputText('');
    setProgress(0);
    setDetectedCount(0);
    setIsProcessing(false);
  };

  const walletsWithBalance = wallets.filter((w) => w.hasBalance).length;
  const sortedWallets = [...wallets].sort((a, b) => (b.hasBalance ? 1 : 0) - (a.hasBalance ? 1 : 0));

  return (
    <div className="min-h-screen bg-gray-850" style={{ backgroundColor: '#1c1e26' }}>
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
              className="text-xs text-gray-500 hover:text-indigo-400 transition-colors flex items-center gap-1"
            >
              <span>?</span> 입력 안내
            </button>
          </div>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={'시드문구를 여기에 붙여넣으세요.\n여러 개를 한 번에 입력해도 자동으로 분리됩니다.\n\n예) abandon ability able about above absent absorb abstract absurd abuse access accident'}
            className="w-full h-40 rounded-xl border border-gray-700 bg-gray-900/70 px-4 py-3 text-sm font-mono text-gray-200 placeholder-gray-600 resize-none focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all scrollbar-thin"
            disabled={isProcessing}
          />
          {inputText && (
            <p className="mt-1.5 text-xs text-gray-500 text-right">
              감지된 BIP39 단어: {inputText.toLowerCase().split(/[\s,;\n\r]+/).filter(Boolean).length}개
            </p>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-3 mb-6">
          {!isProcessing ? (
            <>
              <button
                onClick={handleCheck}
                disabled={!inputText.trim()}
                className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold py-3 text-sm transition-all active:scale-95"
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
              className="flex-1 rounded-xl bg-red-600/80 hover:bg-red-600 text-white font-semibold py-3 text-sm transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <div className="w-3.5 h-3.5 border-2 border-white/60 border-t-white rounded-full animate-spin"></div>
              조회 중단
            </button>
          )}
        </div>

        {/* Progress */}
        {isProcessing && (
          <div className="mb-6">
            <div className="flex justify-between text-xs mb-2">
              <span className="text-gray-400">잔액 조회 중... ({detectedCount}개 시드문구)</span>
              <span className="font-mono text-indigo-400">{Math.round(progress)}%</span>
            </div>
            <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Summary */}
        {wallets.length > 0 && !isProcessing && (
          <div className="mb-6 rounded-xl border border-gray-700/60 bg-gray-800/40 p-4 text-center">
            <span className="text-white font-semibold text-lg">{wallets.length}개</span>
            <span className="text-gray-400 mx-2">조회 완료 —</span>
            <span className={`font-bold text-lg ${walletsWithBalance > 0 ? 'text-emerald-400' : 'text-gray-500'}`}>
              {walletsWithBalance}개
            </span>
            <span className="text-gray-400 ml-2">에 잔액 있음</span>
            {walletsWithBalance > 0 && (
              <p className="text-xs text-emerald-400/70 mt-1">
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
                index={sortedWallets.indexOf(wallet)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="fixed bottom-4 right-4 text-xs text-gray-600 font-mono pointer-events-none">
        Made By PINALO
      </div>
    </div>
  );
}
