const fs = require('fs');

const code = fs.readFileSync('src/components/StatusTracker.jsx', 'utf8');

// 1. Add imports
let modified = code.replace(
  'Truck, Globe, AlertCircle, DollarSign, Edit3, MessageSquare, Plus, Trash2, X, Tag',
  'Truck, Globe, AlertCircle, DollarSign, Edit3, MessageSquare, Plus, Trash2, X, Tag, RefreshCw, Check, Copy, Receipt, Calculator'
);

// 2. Add state inside the component
const stateInjection = `
  const [showAddSaleModal, setShowAddSaleModal] = useState(false);
  const [newSaleData, setNewSaleData] = useState({ title: '', buyer: '', amountSgd: '', status: 'listed', orderDate: new Date().toISOString().split('T')[0], comment: '' });

  // --- Bill Modal State ---
  const [billingOrder, setBillingOrder] = useState(null);
  const [billExchangeRate, setBillExchangeRate] = useState('');
  const [billRoundMode, setBillRoundMode] = useState('ceil_1');
  const [billCopied, setBillCopied] = useState(false);
`;

modified = modified.replace(
  `  const [showAddSaleModal, setShowAddSaleModal] = useState(false);
  const [newSaleData, setNewSaleData] = useState({ title: '', buyer: '', amountSgd: '', status: 'listed', orderDate: new Date().toISOString().split('T')[0], comment: '' });`,
  stateInjection
);

// 3. Add the billBreakdown and handlers
const handlersInjection = `
  const handleOpenBill = (ord) => {
    setBillingOrder(ord);
    const evt = events.find(e => e.id === ord.eventId);
    setBillExchangeRate(String(evt?.exchangeRate || 1));
    setBillRoundMode('ceil_1');
    setBillCopied(false);
  };

  const billBreakdown = React.useMemo(() => {
    if (!billingOrder) return { items: [], finalTotalSgd: 0, finalTotalLocal: 0 };
    const rate = Number(billExchangeRate) || 0;
    const itemsList = [];
    let totalSgd = 0;
    let totalLocal = 0;
    const evt = events.find(e => e.id === billingOrder.eventId);
    const catalog = evt ? (evt.catalog || []) : [];

    Object.entries(billingOrder.items || {}).forEach(([compositeKey, qty]) => {
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
  }, [billingOrder, billExchangeRate, billRoundMode, events]);

  const cleanSgd = (n) => Number(Number(n || 0).toFixed(2));

  const handleCopyBill = () => {
    if (!billingOrder) return;
    const evt = events.find(e => e.id === billingOrder.eventId);
    const currencyCode = evt?.currencyCode || 'USD';

    let text = \`🧾 MERCH ORDER BILL — \${billingOrder.personName}\\n\`;
    text += \`========================================\\n\\n\`;
    billBreakdown.items.forEach((item, idx) => {
      const sizeLabel = item.size ? \` [\${item.size}]\` : '';
      text += \`\${idx + 1}. \${item.name}\${sizeLabel} (x\${item.qty})\\n\`;
      text += \`   \${formatCurrency(item.lineForeignTotal, currencyCode)} ➔ $\${cleanSgd(item.roundedSgdTotal)} SGD\\n\`;
    });
    text += \`\\n========================================\\n\`;
    text += \`💰 FINAL TOTAL: $\${cleanSgd(billBreakdown.finalTotalSgd)} SGD\\n\`;
    navigator.clipboard.writeText(text);
    setBillCopied(true);
    setTimeout(() => setBillCopied(false), 2500);
  };

  const handleSaveBillAmount = (amount) => {
    if (!billingOrder) return;
    const evtId = billingOrder.eventId;
    const currentOrders = ordersMap[evtId] || [];
    const updated = currentOrders.map((ord) =>
      ord.id === billingOrder.id ? { ...ord, billedAmountSgd: amount } : ord
    );
    onUpdateOrdersForEvent(evtId, updated);
    setBillingOrder((prev) => (prev ? { ...prev, billedAmountSgd: amount } : null));
  };
`;

modified = modified.replace(
  `  const getStatusOptions = (actType) => {`,
  handlersInjection + '\n\n  const getStatusOptions = (actType) => {'
);

// 4. Add "Bill" button in the table row
const rowInjection = `
                      <button onClick={() => setEditingOrder({ ...ord })} className="mt-2 text-[10px] font-bold text-[#716a5d] hover:text-[#c05c3b] underline">Edit</button>
                      {act === 'go' && ord.orderType !== 'host' && (
                         <button onClick={() => handleOpenBill(ord)} className="mt-2 ml-2 text-[10px] font-bold text-[#716a5d] hover:text-[#059669] underline">Bill</button>
                      )}
`;
modified = modified.replace(
  `<button onClick={() => setEditingOrder({ ...ord })} className="mt-2 text-[10px] font-bold text-[#716a5d] hover:text-[#c05c3b] underline">Edit</button>`,
  rowInjection
);

// 5. Add Modal JSX at the end
const modalJSX = `
      {/* Generate Bill Modal */}
      {billingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#23201c]/60 backdrop-blur-sm p-4">
          <div className="bg-[#fdfbf7] border border-[#ded5c2] rounded-[32px] p-6 w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-black font-heading text-[#23201c] flex items-center gap-2">
                  <Receipt className="w-6 h-6 text-[#c05c3b]" />
                  Bill for: {billingOrder.personName || 'Member'}
                </h3>
                <p className="text-xs text-[#716a5d] font-bold mt-1">
                  Adjust exchange rate & rounding to generate final SGD total.
                </p>
              </div>
              <button
                onClick={() => setBillingOrder(null)}
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
                  onClick={() => {
                    const evt = events.find(e => e.id === billingOrder.eventId);
                    setBillExchangeRate(String(evt?.exchangeRate || 1));
                  }}
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
                      className={\`px-2.5 py-1.5 rounded-xl text-xs font-extrabold border transition \${
                        billRoundMode === mode.id
                          ? 'bg-[#c05c3b] text-white border-[#ab4e31] shadow-xs'
                          : 'bg-white text-[#5c5549] border-[#ded5c2] hover:bg-[#f4eee2]'
                      }\`}
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
                        {formatCurrency(item.lineForeignTotal, billingOrder.currencyCode || 'USD')}
                        <span className="text-[#a89f91] mx-1">➔</span>
                        <span className="text-[#8c8273]">
                          Exact: \${(item.lineForeignTotal * (Number(billExchangeRate) || 0)).toFixed(2)} SGD
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-[10px] uppercase font-bold text-[#8c8273]">Rounded</div>
                      <div className="text-sm font-black font-mono text-[#059669] bg-[#ecfdf5] border border-[#a7f3d0] px-2.5 py-1 rounded-xl shadow-inner">
                        \${cleanSgd(item.roundedSgdTotal)} SGD
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
                \${cleanSgd(billBreakdown.finalTotalSgd)} <span className="text-sm font-normal text-white">SGD</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 mt-4 shrink-0">
              <button
                onClick={() => handleSaveBillAmount(billBreakdown.finalTotalSgd)}
                disabled={billBreakdown.items.length === 0}
                className="w-full py-3 rounded-xl bg-[#059669] hover:bg-[#047857] text-white font-extrabold text-xs transition flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50"
              >
                <DollarSign className="w-4 h-4 stroke-[2.5]" />
                <span>Save Final Amount (\${cleanSgd(billBreakdown.finalTotalSgd)} SGD) to Order Status</span>
              </button>

              {billingOrder.billedAmountSgd !== undefined && billingOrder.billedAmountSgd !== null && (
                <button
                  onClick={() => handleSaveBillAmount(null)}
                  className="w-full py-1.5 rounded-lg bg-[#f4eee2] hover:bg-[#ede5d6] text-[#716a5d] font-bold text-[11px] transition text-center"
                >
                  Current Saved: \${cleanSgd(billingOrder.billedAmountSgd)} SGD — (Click to Reset to Auto)
                </button>
              )}

              <button
                onClick={handleCopyBill}
                disabled={billBreakdown.items.length === 0}
                className={\`w-full py-3.5 rounded-xl font-extrabold text-sm transition flex items-center justify-center gap-2 shadow-md \${
                  billCopied
                    ? 'bg-[#059669] text-white'
                    : 'bg-[#c05c3b] hover:bg-[#ab4e31] text-white disabled:opacity-50 disabled:pointer-events-none'
                }\`}
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
      )}
    </div>
  );
`;
modified = modified.replace('    </div>\n  );\n}', modalJSX + '\n}');

fs.writeFileSync('src/components/StatusTracker.jsx', modified);
console.log('Injected bill modal!');
