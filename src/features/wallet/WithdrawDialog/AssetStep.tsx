import React from 'react';
import type { AssetConfig, NetworkInfo } from '../types';
import { useTranslation } from '../../../lib/i18n';

interface AssetStepProps {
  assets: AssetConfig[];
  selectedAsset: string;
  selectedNetwork: string;
  onSelectAsset: (symbol: string) => void;
  onSelectNetwork: (networkId: string) => void;
  networks: NetworkInfo[];
  availableAtomic: string;
  decimals: number;
}

export function AssetStep({ assets, selectedAsset, selectedNetwork, onSelectAsset, onSelectNetwork, networks, availableAtomic, decimals }: AssetStepProps) {
  const { t } = useTranslation();
  const formatAvailable = () => {
    try {
      const big = BigInt(availableAtomic);
      const divisor = BigInt(10) ** BigInt(decimals);
      const intPart = big / divisor;
      const fracPart = big % divisor;
      const fracStr = fracPart.toString().padStart(decimals, '0').slice(0, 6).replace(/0+$/, '');
      return fracStr ? `${intPart}.${fracStr}` : intPart.toString();
    } catch {
      return '0';
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-white font-bold text-[16px] mb-3">{t('asset')}</h3>
        <div className="grid grid-cols-2 gap-2.5">
          {assets.map((asset) => {
            const active = selectedAsset === asset.symbol;
            return (
              <button
                key={asset.symbol}
                type="button"
                onClick={() => onSelectAsset(asset.symbol)}
                className={`relative p-3.5 rounded-2xl border text-left transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1683FF] cursor-pointer ${
                  active ? 'lg-glass text-white' : 'bg-white/[0.03] border-white/10 text-white/70 hover:bg-white/[0.05] hover:border-white/15'
                }`}
              >
                <div className="font-bold text-[15px]">{asset.symbol}</div>
                <div className="text-[11px] opacity-60 mt-0.5">{asset.name}</div>
                <div className="text-[11px] mt-2 font-medium opacity-80">{t('available')}: {active ? formatAvailable() : asset.availableAtomic ? (() => { try { const b = BigInt(asset.availableAtomic); const d = BigInt(10)**BigInt(asset.decimals); return (b/d).toString(); } catch { return '0'; } })() : '0'} {asset.symbol}</div>
                {active && <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#1683FF]" />}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="text-white font-bold text-[16px] mb-3">{t('network')}</h3>
        {networks.length === 0 ? (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-[13px]">
            {t('no_networks_for_asset')}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {networks.map((net) => {
              const active = selectedNetwork === net.id;
              return (
                <button
                  key={net.id}
                  type="button"
                  onClick={() => onSelectNetwork(net.id)}
                  className={`p-3.5 rounded-2xl border flex items-center justify-between text-left transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1683FF] cursor-pointer ${
                    active ? 'lg-glass text-white' : 'bg-white/[0.03] border-white/10 text-white/70 hover:bg-white/[0.05]'
                  }`}
                >
                  <div>
                    <div className="font-semibold text-[14px]">{net.displayName}</div>
                    <div className="text-[11px] opacity-60">{net.name}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {active && <div className="w-5 h-5 rounded-full bg-[#1683FF] flex items-center justify-center text-white text-[10px]">✓</div>}
                  </div>
                </button>
              );
            })}
          </div>
        )}
        {networks.length > 1 && selectedNetwork && (
          <p className="mt-3 text-amber-300/80 text-[12px] leading-relaxed bg-amber-500/10 border border-amber-500/15 rounded-xl p-2.5">
            ⚠️ {t('network_warning')}
          </p>
        )}
      </div>
    </div>
  );
}
