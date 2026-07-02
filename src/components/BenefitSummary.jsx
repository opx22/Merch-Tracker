import React from 'react';
import confetti from 'canvas-confetti';
import { Sparkles, Award, TrendingUp, Users, DollarSign, Gift, CheckCircle2, ArrowDownRight } from 'lucide-react';
import { formatCurrency } from '../utils/calculations';

export default function BenefitSummary({ activeEvent, summaryData }) {
  const {
    processedOrders,
    totalEventLocalSpend,
    totalEventSgdSpend,
    otherRemaindersSum,
    totalEffectiveBenefits,
    poolingBonusBenefits,
  } = summaryData;

  const currencyCode = activeEvent?.currencyCode || 'USD';
  const threshold = activeEvent?.benefitThreshold || 50;

  const handleCelebrate = () => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#c05c3b', '#d97706', '#b45309', '#10b981'],
    });
  };

  const myOrder = processedOrders.find((o) => o.isMyOrder);

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-5 pb-28">
      {/* Title & Celebration */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black font-heading text-[#23201c]">Event Benefits Summary</h2>
          <p className="text-xs text-[#716a5d]">Consolidated GO totals & fractional photocard pooling</p>
        </div>
        <button
          onClick={handleCelebrate}
          className="p-2.5 rounded-2xl bg-gradient-to-br from-[#fef8f0] to-[#fceee0] border border-[#c05c3b]/50 text-[#c05c3b] hover:scale-105 transition active:scale-95 shadow-sm"
          title="Celebrate GO Benefit Milestone!"
        >
          <Gift className="w-5 h-5 animate-bounce" />
        </button>
      </div>

      {/* Hero Grand Summary Card */}
      <div className="glass-card rounded-3xl p-5 border border-[#e2d4bc] relative overflow-hidden shadow-lg space-y-4">
        <div className="absolute -right-8 -top-8 w-36 h-36 bg-gradient-to-br from-[#c05c3b]/15 to-[#d97706]/15 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between border-b border-[#eae3d2] pb-3">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#c05c3b] block">
              Total Event Spend
            </span>
            <div className="text-2xl font-black font-heading text-[#23201c] font-mono mt-0.5">
              ${totalEventSgdSpend} <span className="text-sm font-sans font-bold text-[#716a5d]">SGD</span>
            </div>
            <div className="text-xs text-[#8c8273] font-mono mt-0.5">
              ({formatCurrency(totalEventLocalSpend, currencyCode)})
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#b45309] block">
              Total PCs Earned
            </span>
            <div className="text-3xl font-black font-heading text-[#d97706] flex items-center justify-end gap-1.5 mt-0.5">
              <Sparkles className="w-6 h-6 text-[#d97706] fill-[#d97706] animate-spin" style={{ animationDuration: '8s' }} />
              <span>{totalEffectiveBenefits}</span>
            </div>
            {poolingBonusBenefits > 0 && (
              <span className="inline-block bg-gradient-to-r from-[#c05c3b] to-[#d97706] text-white text-[10px] font-black px-2.5 py-0.5 rounded-full mt-1 shadow-xs">
                +{poolingBonusBenefits} Bonus from Pooling!
              </span>
            )}
          </div>
        </div>

        {/* Pooling Breakdown Pill */}
        <div className="bg-[#fcfaf6] border border-[#e6decb] rounded-2xl p-3.5 space-y-2 shadow-inner">
          <div className="flex items-center gap-1.5 text-xs font-black text-[#c05c3b]">
            <TrendingUp className="w-4 h-4" />
            <span>Fractional Remainder Pooling Engine</span>
          </div>

          <p className="text-xs text-[#5c5549] leading-relaxed">
            Standard individual buyers round down to the nearest benefit. By consolidating the decimal leftovers (remainders) into <strong className="text-[#23201c]">{myOrder ? myOrder.personName : 'My Order'}</strong>, your GO gained <strong className="text-[#b45309] font-extrabold">{otherRemaindersSum.toFixed(2)}</strong> in extra fractional threshold value!
          </p>

          {myOrder && (
            <div className="pt-2 border-t border-[#eae3d2] flex items-center justify-between text-xs font-mono">
              <span className="text-[#716a5d] font-semibold">My Order Combined Raw:</span>
              <span className="font-extrabold text-[#059669]">
                {myOrder.combinedRawBenefit.toFixed(2)} ➔ {myOrder.effectiveBenefit} PCs
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Individual Order Breakdown */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#8c8273] px-1 flex items-center justify-between">
          <span>Order & Remainder Breakdown</span>
          <span>Threshold: {formatCurrency(threshold, currencyCode)} / PC</span>
        </h3>

        {processedOrders.map((ord) => (
          <div
            key={ord.id}
            className={`p-3.5 rounded-2xl border transition flex items-center justify-between gap-3 ${
              ord.isMyOrder
                ? 'bg-[#fef8f0] border-[#c05c3b]/60 shadow-sm'
                : 'bg-white border-[#e6decb]'
            }`}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-sm font-extrabold truncate ${ord.isMyOrder ? 'text-[#c05c3b]' : 'text-[#23201c]'}`}>
                  {ord.personName}
                </span>
                {ord.isMyOrder && (
                  <span className="text-[9px] bg-[#c05c3b] text-white font-extrabold px-1.5 py-0.2 rounded uppercase">
                    Host GO
                  </span>
                )}
              </div>

              <div className="text-xs text-[#716a5d] flex items-center gap-2 font-mono">
                <span>Spend: ${ord.orderSgdSpend} SGD</span>
                <span>•</span>
                <span>Raw: {ord.rawBenefit.toFixed(2)}</span>
              </div>
            </div>

            {/* Benefit & Remainder */}
            <div className="text-right shrink-0">
              <div className="text-sm font-black text-[#b45309] font-mono flex items-center justify-end gap-1">
                <Sparkles className="w-3.5 h-3.5 text-[#d97706]" />
                <span>{ord.effectiveBenefit} PC</span>
              </div>

              <div className="text-[11px] font-mono mt-0.5">
                {ord.isMyOrder ? (
                  ord.pooledRemaindersAdded > 0 ? (
                    <span className="text-[#059669] font-extrabold flex items-center justify-end gap-0.5">
                      <ArrowDownRight className="w-3 h-3" />
                      +{ord.pooledRemaindersAdded.toFixed(2)} pooled
                    </span>
                  ) : (
                    <span className="text-[#716a5d]">Remainder: {ord.remainder.toFixed(2)}</span>
                  )
                ) : (
                  <span className="text-[#b45309] font-semibold">
                    Rem: <strong className="font-bold">+{ord.remainder.toFixed(2)}</strong>
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
