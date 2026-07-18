import React, { useState, useMemo } from 'react';
import { X, Calculator, RefreshCw, DollarSign, Check, Copy, Receipt } from 'lucide-react';
import { formatCurrency } from '../utils/calculations';

export default function BillModal({
  order,
  events,
  onClose,
  onSaveAmount
}) {
  const evt = events.find(e => e.id === order.eventId);
  const catalog = evt ? (evt.catalog || []) : [];
  const currencyCode = evt?.currencyCode || 'USD';
  const defaultExchangeRate = evt?.exchangeRate || 1;

  const [billExchangeRate, setBillExchangeRate] = useState(String(defaultExchangeRate));
  const [billRoundMode, setBillRoundMode] = useState('ceil_1');
  const [billCopied, setBillCopied] = useState(false);

  const billBreakdown = useMemo(() => {
    if (!order) return { items: [], finalTotalSgd: 0, finalTotalLocal: 0 };
    const rate = Number(billExchangeRate) || 0;
    const itemsList = [];
    let totalSgd = 0;
    let totalLocal = 0;

    Object.entries(order.items || {}).forEach(([compositeKey, qty]) => {
      const quantity = Number(qty || 0);
      if (quantity > 0) {
        const [catId, sizeStr] = compositeKey.split('__');
        const catItem = catalog.find((c) => c.id === catId);
        if (catItem) {
          const foreignPrice = Number(catItem.price) || 0;
          const lineForeignTotal = foreignPrice * quantity;
          const rawSgdTotal = lineForeignTotal * rate;
          let roundedSgdTotal = rawSgdTotal;
          if (billRoundMode === 'ceil_1' || billRoundMode === 'round_1') {
            roundedSgdTotal = Math.ceil(rawSgdTotal);
          } else if (billRoundMode === 'ceil_05' || billRoundMode === 'round_05') {
            roundedSgdTotal = Math.ceil(rawSgdTotal * 2) / 2;
          } else if (billRoundMode === 'ceil_01' || billRoundMode === 'round_01') {
            roundedSgdTotal = Math.ceil(rawSgdTotal * 10) / 10;
          } else if (billRoundMode === 'exact') {
            roundedSgdTotal = Number(rawSgdTotal.toFixed(2));
          }

          totalLocal += lineForeignTotal;
          totalSgd += roundedSgdTotal;

          itemsList.push({
            id: compositeKey,
            name: catItem.name,
            size: sizeStr || '',
            qty: quantity,
            foreignPrice,
            lineForeignTotal,
            rawSgdTotal,
            roundedSgdTotal,
          });
        }
      }
    });

    return { items: itemsList, finalTotalSgd: totalSgd, finalTotalLocal: totalLocal };
  }, [order, billExchangeRate, billRoundMode, catalog]);

  const cleanSgd = (n) => Number(Number(n || 0).toFixed(2));

  const handleCopyBill = () => {
    if (!order) return;

    let text = `🧾 MERCH ORDER BILL — ${order.personName}\n`;
    text += `========================================\n\n`;

    billBreakdown.items.forEach((item, idx) => {
      const sizeLabel = item.size ? ` [${item.size}]` : '';
      text += `${idx + 1}. ${item.name}${sizeLabel} (x${item.qty})\n`;
      text += `   ${formatCurrency(item.lineForeignTotal, currencyCode)} ➔ $${cleanSgd(item.roundedSgdTotal)} SGD\n`;
    });

    text += `\n========================================\n`;
    text += `💰 FINAL TOTAL: $${cleanSgd(billBreakdown.finalTotalSgd)} SGD\n`;

    navigator.clipboard.writeText(text);
    setBillCopied(true);
    setTimeout(() => setBillCopied(false), 2500);
  };

  if (!order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#23201c]/60 backdrop-blur-sm p-4">
      <div className="bg-[#fdfbf7] border border-[#ded5c2] rounded-[32px] p-6 w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xl font-black font-heading text-[#23201c] flex items-center gap-2">
              <Receipt className="w-6 h-6 text-[#c05c3b]" />
              Bill for: {order.personName || 'Member'}
            </h3>
            <p className="text-xs text-[#716a5d] font-bold mt-1">
              Adjust exchange rate & rounding to generate final SGD total.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-[#f4eee2] hover:bg-[#ede5d6] text-[#716a5d] rounded-full transition"
          >
            <X className="w-5 h-5 stroke-[3]" />
          </button>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-2xl p-4 border border-[#ded5c2] space-y-3 mb-4 shadow-sm shrink-0">
          <div className="flex items-center justify-between">
            <label className="text-xs font-black text-[#5c5549] flex items-center gap-1.5">
              <Calculator className="w-4 h-4 text-[#c05c3b]" />
              Exchange Rate (1 Local = X SGD)
            </label>
            <button
              onClick={() => setBillExchangeRate(String(defaultExchangeRate))}
              className="text-[11px] font-bold text-[#c05c3b] hover:underline flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Reset to Default</span>
            </button>
          </div>
          <input
            type="number"
            step="any"
            value={billExchangeRate}
            onChange={(e) => setBillExchangeRate(e.target.value)}
            placeholder="0.00098"
            className="w-full bg-white border border-[#ded5c2] rounded-xl px-3.5 py-2 font-mono font-bold text-sm text-[#23201c] focus:outline-none focus:border-[#c05c3b] shadow-xs"
          />

          <div className="pt-1">
            <label className="text-xs font-black text-[#5c5549] block mb-1.5">
              Round Up Amount at Each Item:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {[
                { id: 'ceil_1', label: '⬆️ Nearest $1.00' },
                { id: 'ceil_05', label: '⬆️ Nearest $0.50' },
                { id: 'ceil_01', label: '⬆️ Nearest $0.10' },
                { id: 'exact', label: 'Exact Cents' },
              ].map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setBillRoundMode(mode.id)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-extrabold border transition ${
                    billRoundMode === mode.id
                      ? 'bg-[#c05c3b] text-white border-[#ab4e31] shadow-xs'
                      : 'bg-white text-[#5c5549] border-[#ded5c2] hover:bg-[#f4eee2]'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Itemized List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-60">
          <div className="text-[11px] font-black uppercase text-[#8c8273] tracking-wider px-1">
            Ordered Items ({billBreakdown.items.length})
          </div>
          {billBreakdown.items.length === 0 ? (
            <div className="p-6 text-center text-xs font-bold text-[#8c8273] bg-[#fdfbf7] rounded-2xl border border-[#e6decb]">
              No items assigned to this order yet.
            </div>
          ) : (
            billBreakdown.items.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-2xl bg-white border border-[#ded5c2] flex items-center justify-between gap-3 shadow-2xs"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-extrabold text-sm text-[#23201c]">{item.name}</span>
                    {item.size && (
                      <span className="text-[10px] bg-[#f4eee2] text-[#5c5549] font-extrabold px-1.5 py-0.5 rounded border border-[#ded5c2]">
                        {item.size}
                      </span>
                    )}
                    <span className="text-xs font-black text-[#c05c3b] font-mono">x{item.qty}</span>
                  </div>
                  <div className="text-xs font-mono text-[#716a5d] mt-0.5">
                    {formatCurrency(item.lineForeignTotal, currencyCode)}
                    <span className="text-[#a89f91] mx-1">➔</span>
                    <span className="text-[#8c8273]">
                      Exact: ${(item.lineForeignTotal * (Number(billExchangeRate) || 0)).toFixed(2)} SGD
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-[10px] uppercase font-bold text-[#8c8273]">Rounded</div>
                  <div className="text-sm font-black font-mono text-[#059669] bg-[#ecfdf5] border border-[#a7f3d0] px-2.5 py-1 rounded-xl shadow-inner">
                    ${cleanSgd(item.roundedSgdTotal)} SGD
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Final Total Footer */}
        <div className="bg-gradient-to-r from-[#23201c] to-[#3d3730] text-white rounded-2xl p-4 flex items-center justify-between shadow-lg mt-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#ded5c2] block">
              Final Bill Amount
            </span>
            <span className="text-xs text-[#a89f91]">Sum of rounded items</span>
          </div>
          <div className="text-2xl font-black font-mono text-[#fde68a]">
            ${cleanSgd(billBreakdown.finalTotalSgd)} <span className="text-sm font-normal text-white">SGD</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 mt-4 shrink-0">
          <button
            onClick={() => onSaveAmount(billBreakdown.finalTotalSgd)}
            disabled={billBreakdown.items.length === 0}
            className="w-full py-3 rounded-xl bg-[#059669] hover:bg-[#047857] text-white font-extrabold text-xs transition flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50"
          >
            <DollarSign className="w-4 h-4 stroke-[2.5]" />
            <span>Save Final Amount (${cleanSgd(billBreakdown.finalTotalSgd)} SGD) to Order Status</span>
          </button>

          {order.billedAmountSgd !== undefined && order.billedAmountSgd !== null && (
            <button
              onClick={() => onSaveAmount(null)}
              className="w-full py-1.5 rounded-lg bg-[#f4eee2] hover:bg-[#ede5d6] text-[#716a5d] font-bold text-[11px] transition text-center"
            >
              Current Saved: ${cleanSgd(order.billedAmountSgd)} SGD — (Click to Reset to Auto)
            </button>
          )}

          <button
            onClick={handleCopyBill}
            disabled={billBreakdown.items.length === 0}
            className={`w-full py-3.5 rounded-xl font-extrabold text-sm transition flex items-center justify-center gap-2 shadow-md ${
              billCopied
                ? 'bg-[#059669] text-white'
                : 'bg-[#c05c3b] hover:bg-[#ab4e31] text-white disabled:opacity-50 disabled:pointer-events-none'
            }`}
          >
            {billCopied ? (
              <>
                <Check className="w-5 h-5 stroke-[3]" />
                <span>✅ Formatted Bill Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="w-5 h-5 stroke-[2.5]" />
                <span>📋 Copy Formatted Bill to Clipboard</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
