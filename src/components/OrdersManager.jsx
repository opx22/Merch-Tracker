import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Sparkles,
  User,
  ChevronDown,
  ChevronUp,
  Minus,
  ShieldAlert,
  ShoppingBag,
  X,
  Calendar,
  CreditCard,
  Edit3,
  ArrowRight,
  Truck,
  MessageSquare,
  DollarSign,
  Gift,
  Receipt,
  Copy,
  Check,
  RefreshCw
} from 'lucide-react';
import { formatCurrency } from '../utils/calculations';

export default function OrdersManager({
  activeEvent,
  processedOrders,
  summaryData = {},
  onUpdateOrders,
  onSetMyOrder,
  onUpdateCatalog,
}) {
  const catalog = activeEvent?.catalog || [];
  const currencyCode = activeEvent?.currencyCode || 'USD';

  const [showAddModal, setShowAddModal] = useState(false);
  const [expandedOrders, setExpandedOrders] = useState({});
  const [addingCatalogToOrder, setAddingCatalogToOrder] = useState(null);
  const [editingMetadataOrder, setEditingMetadataOrder] = useState(null);
  const [showSgd, setShowSgd] = useState(true);
  const [showRawBenefit, setShowRawBenefit] = useState(true);

  // Quick Create Item State
  const [quickNewItemName, setQuickNewItemName] = useState('');
  const [quickNewItemPrice, setQuickNewItemPrice] = useState('');
  const [quickNewItemPC, setQuickNewItemPC] = useState(false);

  // Billing State
  const [billingOrder, setBillingOrder] = useState(null);
  const [billExchangeRate, setBillExchangeRate] = useState('');
  const [billRoundMode, setBillRoundMode] = useState('ceil_1'); // 'ceil_1', 'ceil_05', 'ceil_01', 'exact'
  const [billCopied, setBillCopied] = useState(false);

  // Totals calculated from summaryData or processedOrders
  const totalSgd = summaryData.totalSgdSpend || processedOrders.reduce((sum, o) => sum + Number(o.orderSgdSpend || 0), 0);
  const totalLocal = summaryData.totalLocalSpend || processedOrders.reduce((sum, o) => sum + Number(o.orderLocalSpend || 0), 0);
  const totalEffectivePCs = summaryData.totalEffectiveBenefits || processedOrders.reduce((sum, o) => sum + Number(o.effectiveBenefit || 0), 0);
  const totalItemsCount = processedOrders.reduce((sum, o) => sum + Number(o.totalItemsCount || 0), 0);
  
  const catalogAggregation = React.useMemo(() => {
    if (summaryData.catalogAggregation && Object.keys(summaryData.catalogAggregation).length > 0) {
      return summaryData.catalogAggregation;
    }
    const map = {};
    const rate = activeEvent?.exchangeRate || 1;
    const itemMap = new Map((activeEvent?.catalog || []).map((i) => [i.id, i]));
    processedOrders.forEach((order) => {
      Object.entries(order.items || {}).forEach(([itemId, qty]) => {
        const quantity = Number(qty || 0);
        if (quantity > 0) {
          const item = itemMap.get(itemId);
          if (item) {
            const itemSize = (order.itemSizes?.[itemId] || item.size || '').trim();
            const key = itemSize ? `${itemId}__${itemSize}` : itemId;
            if (!map[key]) {
              map[key] = {
                id: key,
                itemId: itemId,
                name: item.name || 'Unknown Item',
                size: itemSize,
                price: Number(item.price || 0),
                qty: 0,
                totalLocal: 0,
                totalSgd: 0,
              };
            }
            map[key].qty += quantity;
            map[key].totalLocal += Number(item.price || 0) * quantity;
            map[key].totalSgd = Number((map[key].totalLocal * rate).toFixed(2));
          }
        }
      });
    });
    return map;
  }, [summaryData.catalogAggregation, processedOrders, activeEvent]);

  // New Order Form state
  const [newOrderData, setNewOrderData] = useState({
    personName: '',
    orderType: 'taking', // 'taking' | 'placing' | 'host'
    status: 'unpaid',
    orderDate: new Date().toISOString().split('T')[0],
    paymentDate: '',
    collectionDate: '',
    comment: '',
    initialItemName: '',
    initialItemPrice: '',
    initialItemPC: false,
  });

  const toggleExpand = (orderId) => {
    setExpandedOrders((prev) => ({
      ...prev,
      [orderId]: prev[orderId] === undefined ? false : !prev[orderId],
    }));
  };

  const isMe = (name) => {
    if (!name) return false;
    const clean = name.trim().toLowerCase();
    return clean === 'me' || clean === 'my order' || clean.includes('(host)');
  };

  const renderNameWithMeHighlight = (name, fallback) => {
    const val = name || fallback;
    if (isMe(val)) {
      return <span className="text-[#c05c3b] font-extrabold">{val}</span>;
    }
    return <span className="text-[#23201c] font-bold">{val}</span>;
  };

  const getMemberDisplayName = (ord) => {
    if (!ord) return null;
    const isPlacing = ord.orderType === 'placing';
    if (isPlacing && !ord.isMyOrder && ord.orderType !== 'host') {
      if (ord.seller && ord.seller !== 'Me' && ord.seller.trim() !== '' && ord.seller.trim() !== 'General Shop') {
        return <span className="text-[#23201c] font-bold">{ord.seller}</span>;
      }
      if (ord.personName && ord.personName !== 'Me' && ord.personName.trim() !== '') {
        return <span className="text-[#23201c] font-bold">{ord.personName}</span>;
      }
      if (ord.seller && ord.seller.trim() !== '' && ord.seller !== 'Me') {
        return <span className="text-[#23201c] font-bold">{ord.seller}</span>;
      }
      return <span className="text-[#23201c] font-bold">General Seller</span>;
    }
    return renderNameWithMeHighlight(ord.personName, 'Me');
  };

  const getMemberDisplayString = (ord) => {
    if (!ord) return '';
    const isPlacing = ord.orderType === 'placing';
    if (isPlacing && !ord.isMyOrder && ord.orderType !== 'host') {
      if (ord.seller && ord.seller !== 'Me' && ord.seller.trim() !== '' && ord.seller.trim() !== 'General Shop') return ord.seller;
      if (ord.personName && ord.personName !== 'Me' && ord.personName.trim() !== '') return ord.personName;
      if (ord.seller && ord.seller.trim() !== '' && ord.seller !== 'Me') return ord.seller;
      return 'General Seller';
    }
    return ord.personName || 'Me';
  };

  const handleAddPerson = (e) => {
    e.preventDefault();
    if (!newOrderData.personName.trim() && !newOrderData.initialItemName?.trim() && newOrderData.orderType !== 'host') return;
    const isFirst = processedOrders.length === 0;
    const role = isFirst ? 'host' : newOrderData.orderType;
    const isPlacing = role === 'placing';
    const nameInput = newOrderData.personName.trim() || (isPlacing ? (newOrderData.initialItemName?.trim() || 'General Seller') : (role === 'host' ? 'Me' : 'Member'));

    let buyer = nameInput;
    let seller = 'Me';

    if (isPlacing) {
      buyer = 'Me';
      seller = nameInput;
    } else if (role === 'host') {
      buyer = 'Me';
      seller = 'Me';
    }

    let initialItems = {};

    if (newOrderData.initialItemName?.trim() && newOrderData.initialItemPrice && onUpdateCatalog) {
      const newItemId = `item-${Date.now()}`;
      const newItem = {
        id: newItemId,
        name: newOrderData.initialItemName.trim(),
        price: Number(newOrderData.initialItemPrice) || 0,
        comesWithPC: Boolean(newOrderData.initialItemPC),
        countsTowardsBenefit: true,
        displayOrder: catalog.length + 1,
      };
      onUpdateCatalog([...catalog, newItem]);
      initialItems = { ...initialItems, [newItemId]: 1 };
    }

    const newOrder = {
      id: `ord-${Date.now()}`,
      personName: isPlacing ? nameInput : (role === 'host' ? 'Me' : nameInput),
      buyer,
      seller,
      isMyOrder: isFirst || role === 'host' || isPlacing,
      orderType: isPlacing ? 'placing' : role,
      status: newOrderData.status || 'unpaid',
      orderDate: newOrderData.orderDate || new Date().toISOString().split('T')[0],
      paymentDate: newOrderData.paymentDate || '',
      collectionDate: newOrderData.collectionDate || '',
      comment: newOrderData.comment || '',
      items: initialItems,
    };

    let updated = [...processedOrders];
    if (newOrder.isMyOrder) {
      updated = updated.map((o) => ({
        ...o,
        isMyOrder: false,
        orderType: o.orderType === 'host' ? 'taking' : o.orderType,
      }));
    }

    onUpdateOrders([...updated, newOrder]);
    setNewOrderData({
      personName: '',
      orderType: 'taking',
      status: 'unpaid',
      orderDate: new Date().toISOString().split('T')[0],
      paymentDate: '',
      collectionDate: '',
      comment: '',
      initialItemName: '',
      initialItemPrice: '',
      initialItemPC: false,
    });
    setShowAddModal(false);
    setExpandedOrders((prev) => ({ ...prev, [newOrder.id]: true }));
  };

  const handleDeleteOrder = (orderId, name) => {
    if (window.confirm(`Remove order sheet for "${name || 'Me'}"?`)) {
      onUpdateOrders(processedOrders.filter((o) => o.id !== orderId));
      if (editingMetadataOrder?.id === orderId) {
        setEditingMetadataOrder(null);
      }
    }
  };

  const handleUpdateOrderMetadata = (e) => {
    e.preventDefault();
    if (!editingMetadataOrder) return;
    const updated = processedOrders.map((ord) => {
      if (ord.id === editingMetadataOrder.id) {
        const isHost = editingMetadataOrder.orderType === 'host';
        const isPlacing = editingMetadataOrder.orderType === 'placing';
        const role = editingMetadataOrder.orderType;
        const nameInput = editingMetadataOrder.personName.trim() || 'Me';

        let buyer = editingMetadataOrder.buyer !== undefined ? editingMetadataOrder.buyer : ord.buyer;
        let seller = editingMetadataOrder.seller !== undefined ? editingMetadataOrder.seller : ord.seller;
        if (isPlacing) {
          seller = nameInput;
          if (!buyer) buyer = 'Me';
        } else if (isHost) {
          buyer = 'Me';
          seller = 'Me';
        } else {
          buyer = nameInput;
          if (!seller) seller = 'Me';
        }

        return {
          ...ord,
          personName: isHost ? 'Me' : nameInput,
          buyer,
          seller,
          orderType: role,
          isMyOrder: isHost || isPlacing,
          status: editingMetadataOrder.status,
          orderDate: editingMetadataOrder.orderDate,
          paymentDate: editingMetadataOrder.paymentDate,
          collectionDate: editingMetadataOrder.collectionDate,
          comment: editingMetadataOrder.comment || '',
        };
      }
      if (editingMetadataOrder.orderType === 'host' && ord.id !== editingMetadataOrder.id) {
        return { ...ord, isMyOrder: false, orderType: ord.orderType === 'host' ? 'taking' : ord.orderType };
      }
      return ord;
    });
    onUpdateOrders(updated);
    setEditingMetadataOrder(null);
  };

  const handleQuantityChange = (orderId, itemKey, delta) => {
    const updated = processedOrders.map((ord) => {
      if (ord.id === orderId) {
        const currentQty = Number(ord.items?.[itemKey] || 0);
        const nextQty = Math.max(0, currentQty + delta);
        const newItems = { ...(ord.items || {}) };
        const newSizes = { ...(ord.itemSizes || {}) };
        if (nextQty > 0) {
          newItems[itemKey] = nextQty;
        } else {
          delete newItems[itemKey];
          const [itemId] = itemKey.split('__');
          if (newSizes[itemId]) {
            delete newSizes[itemId];
          }
        }
        return { ...ord, items: newItems, itemSizes: newSizes };
      }
      return ord;
    });
    onUpdateOrders(updated);
  };

  const handleItemSizeChange = (orderId, oldKey, newSizeStr) => {
    const updated = processedOrders.map((ord) => {
      if (ord.id === orderId) {
        const [itemId] = oldKey.split('__');
        const newSize = newSizeStr || '';
        const newKey = newSize ? `${itemId}__${newSize}` : `${itemId}__`;
        if (oldKey === newKey || (oldKey === itemId && !newSize)) return ord;

        const oldQty = Number(ord.items?.[oldKey] || 0);
        if (oldQty === 0) return ord;

        const newItems = {};
        for (const [key, val] of Object.entries(ord.items || {})) {
          if (key === oldKey) {
            newItems[newKey] = (Number(newItems[newKey]) || 0) + oldQty;
          } else if (key === newKey) {
            newItems[newKey] = (Number(newItems[newKey]) || 0) + Number(val);
          } else {
            newItems[key] = val;
          }
        }

        const newSizes = { ...(ord.itemSizes || {}) };
        if (newSizes[itemId]) {
          delete newSizes[itemId];
        }

        return { ...ord, items: newItems, itemSizes: newSizes };
      }
      return ord;
    });
    onUpdateOrders(updated);
  };

  const handleAddVariant = (orderId, itemId) => {
    const updated = processedOrders.map((ord) => {
      if (ord.id === orderId) {
        const newItems = { ...(ord.items || {}) };
        let newKey = `${itemId}__`;
        if (newItems[newKey] !== undefined || newItems[itemId] !== undefined) {
          let count = 2;
          newKey = `${itemId}__Variant ${count}`;
          while (newItems[newKey] !== undefined) {
            count++;
            newKey = `${itemId}__Variant ${count}`;
          }
        }
        newItems[newKey] = 1;
        return { ...ord, items: newItems };
      }
      return ord;
    });
    onUpdateOrders(updated);
  };

  const handleOpenBill = (ord) => {
    setBillingOrder(ord);
    setBillExchangeRate(String(activeEvent?.exchangeRate || 1));
    setBillRoundMode('ceil_1');
    setBillCopied(false);
  };

  const billBreakdown = React.useMemo(() => {
    if (!billingOrder) return { items: [], finalTotalSgd: 0, finalTotalLocal: 0 };
    const rate = Number(billExchangeRate) || 0;
    const itemsList = [];
    let totalSgd = 0;
    let totalLocal = 0;

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
  }, [billingOrder, billExchangeRate, billRoundMode, catalog]);

  const cleanSgd = (n) => Number(Number(n || 0).toFixed(2));

  const handleCopyBill = () => {
    if (!billingOrder) return;

    let text = `🧾 MERCH ORDER BILL — ${billingOrder.personName}\n`;
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

  const handleSaveBillAmount = (amount) => {
    if (!billingOrder) return;
    const updated = processedOrders.map((ord) =>
      ord.id === billingOrder.id ? { ...ord, billedAmountSgd: amount } : ord
    );
    onUpdateOrders(updated);
    setBillingOrder((prev) => (prev ? { ...prev, billedAmountSgd: amount } : null));
  };

  const getRoleBadge = (ord) => {
    if (ord.orderType === 'placing') {
      return { label: '📤 Placing Order (Purchase)', color: 'bg-[#475569] text-white' };
    }
    if (ord.isMyOrder || ord.orderType === 'host') {
      return { label: '👑 Host Anchor', color: 'bg-[#c05c3b] text-white' };
    }
    return { label: '📥 Taking Order (Member)', color: 'bg-[#334155] text-slate-100' };
  };

  const currentAddingOrder = addingCatalogToOrder
    ? processedOrders.find((o) => o.id === addingCatalogToOrder.id)
    : null;

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4 pb-28">
      {/* View toggles — global */}
      <div className="flex items-center justify-end gap-2">
        {(activeEvent?.benefitThreshold > 0) && (
          <button
            onClick={() => setShowRawBenefit((v) => !v)}
            title={showRawBenefit ? 'Hide raw benefit breakdown' : 'Show raw benefit breakdown'}
            className={`flex items-center gap-1.5 text-[11px] font-extrabold px-3 py-1.5 rounded-xl border transition active:scale-95 ${
              showRawBenefit
                ? 'bg-[#b45309] text-white border-[#b45309] shadow-sm shadow-[#b45309]/20'
                : 'bg-[#f4eee2] text-[#5c5549] border-[#ded5c2] hover:bg-[#ede5d6]'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>{showRawBenefit ? 'Benefit: On' : 'Benefit: Off'}</span>
          </button>
        )}
        <button
          onClick={() => setShowSgd((v) => !v)}
          title={showSgd ? 'Hide SGD amounts' : 'Show SGD amounts'}
          className={`flex items-center gap-1.5 text-[11px] font-extrabold px-3 py-1.5 rounded-xl border transition active:scale-95 ${
            showSgd
              ? 'bg-[#c05c3b] text-white border-[#c05c3b] shadow-sm shadow-[#c05c3b]/20'
              : 'bg-[#f4eee2] text-[#5c5549] border-[#ded5c2] hover:bg-[#ede5d6]'
          }`}
        >
          <DollarSign className="w-3 h-3" />
          <span>{showSgd ? 'SGD: On' : 'SGD: Off'}</span>
        </button>
      </div>

      {/* Event Purchasing Target & Master Summary Box at Top */}
      <div className="glass-card rounded-3xl p-4 border border-[#e2d6c1] shadow-md bg-gradient-to-br from-[#fefcf8] to-[#f8f3ea] space-y-3.5">
        <div className="flex items-center gap-2 border-b border-[#eae3d2] pb-2.5">
          <div className="p-2 rounded-xl bg-[#c05c3b] text-white shadow-xs">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-black font-heading text-[#23201c] leading-none">Event Master Summary</h3>
            <span className="text-[11px] text-[#716a5d] block mt-0.5">Summed amounts & items across all {processedOrders.length} order sheets</span>
          </div>
        </div>

        {/* KPI Totals */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-white/90 border border-[#ded5c2] rounded-2xl p-3 shadow-2xs">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#716a5d] flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-[#c05c3b]" />
              <span>Total Summed Spend</span>
            </span>
            {showSgd && (
              <div className="text-lg font-black text-[#23201c] font-mono mt-0.5">
                ${Number(totalSgd).toFixed(2)} SGD
              </div>
            )}
            <span className={`text-[11px] font-bold text-[#8c8273] block ${showSgd ? 'mt-0.5' : 'mt-0.5 text-base font-black text-[#23201c] font-mono'}`}>
              {formatCurrency(totalLocal, currencyCode)}
            </span>
          </div>

          {activeEvent?.benefitThreshold > 0 && (
            <div className="bg-white/90 border border-[#ded5c2] rounded-2xl p-3 shadow-2xs">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#b45309] flex items-center gap-1">
                <Gift className="w-3.5 h-3.5 text-[#d97706]" />
                <span>Total Benefits Earned</span>
              </span>
              <div className="text-lg font-black text-[#b45309] font-mono mt-0.5 flex items-center gap-1">
                <Sparkles className="w-4 h-4 text-[#d97706]" />
                <span>{Math.floor(Number(totalEffectivePCs || 0))} PCs</span>
              </div>
              <span className="text-[11px] font-semibold text-[#8c8273] block mt-0.5">
                Across {totalItemsCount} items
              </span>
            </div>
          )}
        </div>

        {/* Full List of Items and Summed Amount */}
        <div className="bg-white/90 border border-[#ded5c2] rounded-2xl p-3 space-y-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-[#716a5d] block border-b border-[#eae3d2] pb-1.5">
            Full Master Shopping List ({totalItemsCount} total items)
          </span>

          {Object.keys(catalogAggregation).length === 0 ? (
            <p className="text-xs text-[#a89f91] italic py-1">No items assigned across orders yet.</p>
          ) : (
            <div className="space-y-1.5">
              {Object.entries(catalogAggregation).map(([catId, data]) => (
                <div key={catId} className="flex items-center justify-between text-xs py-1 border-b border-[#f4eee2] last:border-none">
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-extrabold text-[#23201c] truncate">
                        {data.qty}x {data.name}
                      </span>
                      {data.size && (
                        <span className="text-[10px] bg-[#f4eee2] text-[#5c5549] font-extrabold px-1.5 py-0.2 rounded border border-[#e3d8c4] shrink-0">
                          {data.size}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0 font-mono">
                    {showSgd && (
                      <span className="font-bold text-[#c05c3b] block">
                        ${Number(data.totalSgd).toFixed(2)} SGD
                      </span>
                    )}
                    <span className="text-[10px] text-[#8c8273] block">
                      {formatCurrency(data.totalLocal, currencyCode)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="pt-2 border-t border-[#eae3d2] flex items-center justify-between text-xs font-mono font-black">
            <span className="text-[#5c5549] font-sans">Summed Total:</span>
            <span className="text-[#c05c3b]">
              {showSgd ? `$${Number(totalSgd).toFixed(2)} SGD (${formatCurrency(totalLocal, currencyCode)})` : formatCurrency(totalLocal, currencyCode)}
            </span>
          </div>
        </div>
      </div>

      {/* Title & Add Action */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-xl font-black font-heading text-[#23201c]">Member Orders</h2>
          <p className="text-xs text-[#716a5d]">
            {processedOrders.length} {processedOrders.length === 1 ? 'sheet' : 'sheets'} • Track buyer & seller transactions
          </p>
        </div>
        <button
          onClick={() => {
            setNewOrderData({
              personName: '',
              orderType: 'taking',
              status: 'unpaid',
              orderDate: new Date().toISOString().split('T')[0],
              paymentDate: '',
              collectionDate: '',
              comment: '',
              initialItemName: '',
              initialItemPrice: '',
              initialItemPC: false,
            });
            setShowAddModal(true);
          }}
          className="flex items-center gap-1.5 bg-gradient-to-r from-[#c05c3b] to-[#b45309] hover:from-[#ab4e31] hover:to-[#994607] text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-md shadow-[#c05c3b]/20 transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Add Order Sheet</span>
        </button>
      </div>

      {catalog.length === 0 && (
        <div className="bg-[#fffbeb] border border-[#fde68a] rounded-2xl p-3.5 text-[#92400e] text-xs flex items-start gap-2.5 shadow-xs">
          <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-[#d97706]" />
          <div>
            <span className="font-extrabold block">No catalog items created yet</span>
            <span className="text-[#b45309]">Switch to the Catalog tab to add items first before assigning quantities.</span>
          </div>
        </div>
      )}

      {/* Orders List */}
      {processedOrders.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center border border-[#ded5c2] space-y-3">
          <User className="w-10 h-10 text-[#b4a997] mx-auto stroke-1" />
          <div>
            <h4 className="text-sm font-bold text-[#23201c]">No order sheets created yet</h4>
            <p className="text-xs text-[#716a5d] mt-0.5">Add buyers or supplier proxies to start managing item allocations</p>
          </div>
          <button
            onClick={() => {
              setNewOrderData({
                personName: '',
                orderType: 'taking',
                status: 'unpaid',
                orderDate: new Date().toISOString().split('T')[0],
                paymentDate: '',
                collectionDate: '',
                comment: '',
                initialItemName: '',
                initialItemPrice: '',
                initialItemPC: false,
              });
              setShowAddModal(true);
            }}
            className="px-4 py-2 rounded-xl bg-[#f4eee2] hover:bg-[#ede5d6] text-xs font-bold text-[#3d3730] transition inline-block border border-[#ded5c2]"
          >
            + Add First Order Sheet
          </button>
        </div>
      ) : (
        <div className="space-y-3.5">
          {processedOrders.map((ord) => {
            const isExpanded = expandedOrders[ord.id] !== false;
            const assignedCatalogItems = catalog.filter((item) =>
              Object.entries(ord.items || {}).some(([key, qty]) => key.split('__')[0] === item.id && Number(qty) > 0)
            );
            const roleBadge = getRoleBadge(ord);

            return (
              <div
                key={ord.id}
                className={`rounded-2xl border transition duration-200 overflow-hidden ${
                  ord.isMyOrder
                    ? 'bg-gradient-to-br from-[#fefcf8] to-[#fcf4ea] border-[#c05c3b]/80 shadow-md ring-1 ring-[#c05c3b]/20'
                    : 'bg-white border-[#e6decb] hover:border-[#cfc4af] shadow-xs'
                }`}
              >
                {/* Order Header */}
                <div className="p-3.5 flex items-start justify-between gap-2 border-b border-[#eae3d2]">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    {/* Role Row */}
                    <div className="flex items-center flex-wrap gap-1.5">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${roleBadge.color}`}>
                        {roleBadge.label}
                      </span>
                    </div>

                    {/* Person Name Bar */}
                    <div className="flex items-center gap-1.5 pt-0.5">
                      <h3 className="text-base font-extrabold font-heading text-[#23201c] truncate">
                        {getMemberDisplayName(ord)}
                      </h3>
                    </div>

                    <div className="flex items-center flex-wrap gap-x-2.5 gap-y-1 text-xs pt-0.5">
                      <span className="font-mono font-extrabold text-[#3d3730]">
                        {formatCurrency(ord.orderLocalSpend, currencyCode)}
                      </span>
                      {showSgd && (
                        <>
                          <span className="text-[#a89f91]">•</span>
                          <span className="font-mono font-black text-[#c05c3b]">
                            ${ord.orderSgdSpend} SGD
                          </span>
                        </>
                      )}
                      <span className="text-[#716a5d] text-[11px]">({ord.totalItemsCount} items)</span>
                    </div>

                    {/* Comment Pill Display */}
                    {ord.comment ? (
                      <div
                        onClick={() => setEditingMetadataOrder({ ...ord })}
                        className="bg-[#fffbeb] border border-[#fde68a] rounded-lg px-2 py-1 text-[11px] text-[#92400e] flex items-start gap-1.5 cursor-pointer hover:bg-[#fef3c7]"
                      >
                        <MessageSquare className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#d97706]" />
                        <span className="italic line-clamp-2">{ord.comment}</span>
                      </div>
                    ) : null}
                  </div>

                  {/* Benefit Pill & Actions */}
                  <div className="flex flex-col items-end shrink-0 gap-2">
                    {activeEvent?.benefitThreshold > 0 && (
                      <div className="bg-[#fcfaf6] border border-[#ded5c2] px-2.5 py-1.5 rounded-xl text-right shadow-inner">
                        <div className="text-[10px] uppercase font-bold text-[#8c8273]">Benefit</div>
                        <div className="text-sm font-black text-[#b45309] flex items-center justify-end gap-1 font-mono">
                          <Sparkles className="w-3.5 h-3.5 text-[#d97706]" />
                          <span>{Math.floor(Number(ord.effectiveBenefit || 0))} PC</span>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenBill(ord)}
                        className="px-2.5 py-1 bg-[#fef3c7] hover:bg-[#fde68a] text-[#b45309] border border-[#fcd34d] rounded-xl transition flex items-center gap-1 text-xs font-black shadow-xs active:scale-95 mr-1"
                        title="Generate Bill / Invoice for Buyer"
                      >
                        <Receipt className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Bill</span>
                      </button>
                      <button
                        onClick={() => setEditingMetadataOrder({ ...ord })}
                        className="p-1.5 text-[#8c8273] hover:text-[#c05c3b] transition"
                        title="Edit order sheet info & notes"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteOrder(ord.id, getMemberDisplayString(ord))}
                        className="p-1.5 text-[#a89f91] hover:text-red-600 transition"
                        title="Delete order sheet"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => toggleExpand(ord.id)}
                        className="p-1.5 text-[#5c5549] hover:text-[#23201c] bg-[#f4eee2] border border-[#e3d8c4] rounded-lg transition flex items-center gap-1 text-xs font-semibold"
                      >
                        <span>{isExpanded ? 'Hide' : 'Items'}</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Calculation Breakdown Sub-bar */}
                {(showRawBenefit && activeEvent?.benefitThreshold > 0) && (
                  <div className="px-3.5 py-1.5 bg-[#f8f5ed] border-b border-[#eae3d2] flex items-center justify-between text-[11px]">
                    <div className="text-[#5c5549] flex items-center gap-1">
                      <span>Raw Benefit:</span>
                      <span className="font-mono font-bold text-[#23201c]">
                        {ord.isMyOrder && ord.pooledRemaindersAdded > 0
                          ? `${Number(ord.combinedRawBenefit || 0).toFixed(1)} (${Number(ord.rawBenefit || 0).toFixed(1)} own + ${Number(ord.pooledRemaindersAdded || 0).toFixed(1)} pooled)`
                          : Number(ord.rawBenefit || 0).toFixed(1)}
                      </span>
                    </div>
                    <div>
                      {ord.isMyOrder ? (
                        <span className="text-[#059669] font-bold flex items-center gap-1 font-mono">
                          <Sparkles className="w-3 h-3" />
                          <span>+{Number(ord.pooledRemaindersAdded || 0).toFixed(1)} from remainders</span>
                        </span>
                      ) : (
                        <span className="text-[#b45309] font-semibold">
                          Remainder contribution: <strong className="font-mono">.{Math.round(ord.remainder * 100).toString().padStart(2, '00')}</strong>
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Expanded Ordered Items List */}
                {isExpanded && (
                  <div className="p-3 bg-[#fdfbf7] space-y-2.5">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[10px] font-bold text-[#8c8273] uppercase tracking-wider">
                        Assigned Order Items
                      </span>
                      <button
                        onClick={() => setAddingCatalogToOrder(ord)}
                        className="flex items-center gap-1 text-xs font-extrabold text-[#c05c3b] hover:text-[#ab4e31] bg-[#f7ebe3] hover:bg-[#ebd9cc] border border-[#e8cebf] px-2.5 py-1 rounded-xl transition active:scale-95 shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Add Item from Catalog</span>
                      </button>
                    </div>

                    {assignedCatalogItems.length === 0 ? (
                      <div className="p-4 rounded-xl border border-dashed border-[#ded5c2] text-center bg-[#fcfaf6]">
                        <ShoppingBag className="w-6 h-6 text-[#b4a997] mx-auto mb-1 stroke-1" />
                        <p className="text-xs font-semibold text-[#5c5549]">No items assigned yet</p>
                        <p className="text-[11px] text-[#8c8273]">Tap "+ Add Item from Catalog" above to select merch</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {assignedCatalogItems.map((item) => {
                          const variants = Object.entries(ord.items || {})
                            .filter(([key, qty]) => key.split('__')[0] === item.id && Number(qty) > 0)
                            .map(([compositeKey, qty]) => {
                              const [, sizeStr] = compositeKey.split('__');
                              const currentSize = sizeStr !== undefined ? sizeStr : (ord.itemSizes?.[item.id] || '');
                              return {
                                compositeKey,
                                qty: Number(qty),
                                currentSize,
                              };
                            });

                          const totalQty = variants.reduce((sum, v) => sum + v.qty, 0);
                          const totalSubtotalLocal = totalQty * item.price;

                          return (
                            <div
                              key={item.id}
                              className="p-3 rounded-2xl bg-[#fef8f0] border border-[#c05c3b]/40 shadow-xs space-y-3"
                            >
                              {/* Main Item Header */}
                              <div className="flex items-center justify-between border-b border-[#f4e2d4] pb-2">
                                <div className="min-w-0 pr-2">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-sm font-black text-[#23201c] truncate">
                                      {item.name}
                                    </span>
                                    {item.comesWithPC !== false && (
                                      <span className="text-[9px] bg-[#fef3c7] text-[#b45309] font-extrabold px-1.5 py-0.2 rounded border border-[#fde68a]">PC</span>
                                    )}
                                  </div>
                                  <span className="text-xs font-mono text-[#716a5d] block mt-0.5">
                                    {formatCurrency(item.price, currencyCode)} each
                                    <strong className="text-[#c05c3b] ml-2 font-bold">
                                      (Total: {formatCurrency(totalSubtotalLocal, currencyCode)} • {totalQty} {totalQty === 1 ? 'item' : 'items'})
                                    </strong>
                                  </span>
                                </div>

                                {/* Add another size button at item level */}
                                <button
                                  type="button"
                                  onClick={() => handleAddVariant(ord.id, item.id)}
                                  className="text-xs font-extrabold px-2.5 py-1.5 bg-[#f7ebe3] hover:bg-[#ebd9cc] text-[#c05c3b] border border-[#e8cebf] rounded-xl transition shrink-0 flex items-center gap-1 shadow-2xs active:scale-95"
                                  title="Add another size or variant of this item"
                                >
                                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                                  <span>Add Size / Variant</span>
                                </button>
                              </div>

                              {/* Variants List inside this Item Card */}
                              <div className="space-y-2.5 pt-0.5">
                                {variants.map(({ compositeKey, qty, currentSize }, vIndex) => (
                                  <div
                                    key={`${item.id}-${vIndex}`}
                                    className="p-2.5 rounded-xl bg-white border border-[#ded5c2] shadow-2xs space-y-2"
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <span className="text-[10px] font-extrabold text-[#716a5d] shrink-0">
                                          {variants.length > 1 ? `Variant #${vIndex + 1}:` : 'Type/Size:'}
                                        </span>
                                        <input
                                          type="text"
                                          placeholder="e.g. L, Free Size, Karina Ver..."
                                          value={currentSize}
                                          onChange={(e) => handleItemSizeChange(ord.id, compositeKey, e.target.value)}
                                          onBlur={(e) => handleItemSizeChange(ord.id, compositeKey, e.target.value.trim())}
                                          className="flex-1 bg-[#fdfbf7] border border-[#ded5c2] rounded-lg px-2.5 py-1 text-xs text-[#23201c] focus:outline-none focus:border-[#c05c3b] focus:bg-white shadow-inner font-semibold"
                                        />
                                      </div>

                                      {/* Stepper Control for this variant */}
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <button
                                          onClick={() => handleQuantityChange(ord.id, compositeKey, -1)}
                                          className="w-7 h-7 rounded-lg bg-[#f4eee2] hover:bg-[#ede5d6] border border-[#ded5c2] flex items-center justify-center text-[#23201c] transition active:scale-90"
                                          aria-label="Decrease quantity"
                                        >
                                          <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
                                        </button>
                                        <span className="w-6 text-center font-mono font-black text-sm text-[#23201c]">
                                          {qty}
                                        </span>
                                        <button
                                          onClick={() => handleQuantityChange(ord.id, compositeKey, 1)}
                                          className="w-7 h-7 rounded-lg bg-[#c05c3b] hover:bg-[#ab4e31] flex items-center justify-center text-white transition active:scale-90 shadow-sm shadow-[#c05c3b]/30"
                                          aria-label="Increase quantity"
                                        >
                                          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                                        </button>
                                        <button
                                          onClick={() => handleQuantityChange(ord.id, compositeKey, -qty)}
                                          className="p-1.5 ml-1 text-[#a89f91] hover:text-red-600 transition"
                                          title="Remove variant"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Order Sheet Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#23201c]/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white border border-[#ded5c2] rounded-3xl p-5 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#eae3d2] pb-2.5">
              <h3 className="text-lg font-black text-[#23201c] font-heading">New Order Sheet</h3>
              <button onClick={() => setShowAddModal(false)} className="text-[#8c8273] hover:text-[#23201c] text-sm font-semibold">
                Close
              </button>
            </div>

            <form onSubmit={handleAddPerson} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-[#5c5549] block mb-1">Order Direction / Role</label>
                <select
                  value={newOrderData.orderType}
                  onChange={(e) => setNewOrderData({ ...newOrderData, orderType: e.target.value })}
                  className="w-full bg-[#fcfaf6] border border-[#ded5c2] rounded-xl px-3.5 py-2.5 text-sm text-[#23201c] font-bold focus:outline-none focus:border-[#c05c3b] shadow-inner cursor-pointer"
                >
                  <option value="taking">📥 Taking Order (Member buying FROM me)</option>
                  <option value="placing">📤 Placing Order (I am buying FROM proxy/seller)</option>
                  <option value="host">👑 Host Anchor (My Personal GO Order)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-[#5c5549] block mb-1">
                  {newOrderData.orderType === 'placing'
                    ? 'Seller / Proxy Name (Who you are buying from)'
                    : newOrderData.orderType === 'host'
                    ? 'My Handle / Name'
                    : 'Buyer Name / Handle (Who is buying from you)'}
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder={
                    newOrderData.orderType === 'placing'
                      ? 'e.g. Weverse Shop, @kr_proxy, Carousell Seller'
                      : newOrderData.orderType === 'host'
                      ? 'Me'
                      : 'e.g. Minji K. (@minji_merch)'
                  }
                  value={newOrderData.personName}
                  onChange={(e) => setNewOrderData({ ...newOrderData, personName: e.target.value })}
                  className="w-full bg-[#fcfaf6] border border-[#ded5c2] rounded-xl px-3.5 py-2.5 text-sm text-[#23201c] focus:outline-none focus:border-[#c05c3b] shadow-inner"
                />
              </div>

              {/* Optional Quick-Create Initial Catalog Item */}
              <div className="bg-[#fefaf3] border border-[#e8dfce] rounded-2xl p-3 space-y-2 shadow-inner">
                <div className="text-[11px] font-black uppercase text-[#c05c3b] tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#d97706]" />
                  <span>Add Initial Merch Item (Optional)</span>
                </div>
                <div className="text-[11px] text-[#716a5d]">
                  Key in an item name & price to immediately add it to the catalog and assign it to this order sheet.
                </div>
                <input
                  type="text"
                  placeholder="Item Name (e.g. Karina PC, Album Bundle)"
                  value={newOrderData.initialItemName || ''}
                  onChange={(e) => setNewOrderData({ ...newOrderData, initialItemName: e.target.value })}
                  className="w-full bg-white border border-[#ded5c2] rounded-xl px-3 py-1.5 text-xs font-bold text-[#23201c] focus:outline-none focus:border-[#c05c3b] shadow-2xs"
                />
                {newOrderData.initialItemName && (
                  <div className="flex items-center gap-2 pt-1 animate-fade-in">
                    <div className="relative flex-1">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#8c8273]">{currencyCode}</span>
                      <input
                        type="number"
                        step="any"
                        placeholder="Price"
                        value={newOrderData.initialItemPrice || ''}
                        onChange={(e) => setNewOrderData({ ...newOrderData, initialItemPrice: e.target.value })}
                        className="w-full bg-white border border-[#ded5c2] rounded-xl pl-10 pr-2.5 py-1.5 text-xs font-mono font-bold text-[#23201c] focus:outline-none focus:border-[#c05c3b] shadow-2xs"
                      />
                    </div>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-[#5c5549] cursor-pointer bg-white px-2.5 py-1.5 rounded-xl border border-[#ded5c2] shrink-0">
                      <input
                        type="checkbox"
                        checked={Boolean(newOrderData.initialItemPC)}
                        onChange={(e) => setNewOrderData({ ...newOrderData, initialItemPC: e.target.checked })}
                        className="rounded border-[#ded5c2] text-[#c05c3b] focus:ring-0 cursor-pointer"
                      />
                      <span>With PC?</span>
                    </label>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-bold text-[#5c5549] block mb-1">Initial Status</label>
                  <select
                    value={newOrderData.status}
                    onChange={(e) => setNewOrderData({ ...newOrderData, status: e.target.value })}
                    className="w-full bg-[#fcfaf6] border border-[#ded5c2] rounded-xl px-3 py-2.5 text-xs font-bold text-[#23201c] focus:outline-none focus:border-[#c05c3b] shadow-inner cursor-pointer"
                  >
                    <option value="unpaid">⏳ Unpaid</option>
                    <option value="paid">💳 Paid</option>
                    <option value="completed">✅ Completed</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-[#5c5549] block mb-1">Order Date</label>
                  <input
                    type="date"
                    value={newOrderData.orderDate}
                    onChange={(e) => setNewOrderData({ ...newOrderData, orderDate: e.target.value })}
                    className="w-full bg-[#fcfaf6] border border-[#ded5c2] rounded-xl px-3 py-2 text-xs text-[#23201c] focus:outline-none focus:border-[#c05c3b] shadow-inner"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-bold text-[#5c5549] block mb-1">Payment Received / Sent Date</label>
                  <input
                    type="date"
                    value={newOrderData.paymentDate}
                    onChange={(e) => setNewOrderData({ ...newOrderData, paymentDate: e.target.value })}
                    className="w-full bg-[#fcfaf6] border border-[#ded5c2] rounded-xl px-3 py-2 text-xs text-[#23201c] focus:outline-none focus:border-[#c05c3b] shadow-inner"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#5c5549] block mb-1">Planned Collection / Handover</label>
                  <input
                    type="date"
                    value={newOrderData.collectionDate}
                    onChange={(e) => setNewOrderData({ ...newOrderData, collectionDate: e.target.value })}
                    className="w-full bg-[#fcfaf6] border border-[#ded5c2] rounded-xl px-3 py-2 text-xs text-[#23201c] focus:outline-none focus:border-[#c05c3b] shadow-inner"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#5c5549] block mb-1">Comment / Free Text Note</label>
                <textarea
                  rows="2"
                  placeholder="e.g. Paid via PayNow, meet up at Stadium Gate 3..."
                  value={newOrderData.comment}
                  onChange={(e) => setNewOrderData({ ...newOrderData, comment: e.target.value })}
                  className="w-full bg-[#fcfaf6] border border-[#ded5c2] rounded-xl px-3.5 py-2 text-xs text-[#23201c] focus:outline-none focus:border-[#c05c3b] shadow-inner resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#c05c3b] to-[#b45309] hover:from-[#ab4e31] hover:to-[#994607] text-white font-bold text-sm shadow-md shadow-[#c05c3b]/20 transition active:scale-95 mt-2"
              >
                Create Order Sheet
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Order Info & Dates Modal */}
      {editingMetadataOrder && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#23201c]/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white border border-[#ded5c2] rounded-3xl p-5 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#eae3d2] pb-2.5">
              <h3 className="text-lg font-black text-[#23201c] font-heading">Edit Order Info, Dates & Note</h3>
              <button onClick={() => setEditingMetadataOrder(null)} className="text-[#8c8273] hover:text-[#23201c] text-sm font-semibold">
                Close
              </button>
            </div>

            <form onSubmit={handleUpdateOrderMetadata} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-[#5c5549] block mb-1">Order Direction / Role</label>
                <select
                  value={editingMetadataOrder.orderType || (editingMetadataOrder.isMyOrder ? 'host' : 'taking')}
                  onChange={(e) => setEditingMetadataOrder({ ...editingMetadataOrder, orderType: e.target.value })}
                  className="w-full bg-[#fcfaf6] border border-[#ded5c2] rounded-xl px-3.5 py-2.5 text-sm text-[#23201c] font-bold focus:outline-none focus:border-[#c05c3b] shadow-inner cursor-pointer"
                >
                  <option value="taking">📥 Taking Order (Member buying FROM me)</option>
                  <option value="placing">📤 Placing Order (I am buying FROM proxy/seller)</option>
                  <option value="host">👑 Host Anchor (My Personal GO Order)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-[#5c5549] block mb-1">
                  {editingMetadataOrder.orderType === 'placing'
                    ? 'Seller / Proxy Name (Who you bought from)'
                    : editingMetadataOrder.orderType === 'host'
                    ? 'My Handle / Name'
                    : 'Buyer Name / Handle (Who is buying from you)'}
                </label>
                <input
                  type="text"
                  required
                  value={editingMetadataOrder.personName}
                  onChange={(e) => setEditingMetadataOrder({ ...editingMetadataOrder, personName: e.target.value })}
                  className="w-full bg-[#fcfaf6] border border-[#ded5c2] rounded-xl px-3.5 py-2.5 text-sm text-[#23201c] focus:outline-none focus:border-[#c05c3b] shadow-inner"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-bold text-[#5c5549] block mb-1">Buyer (Who is buying)</label>
                  <input
                    type="text"
                    value={editingMetadataOrder.buyer || ''}
                    onChange={(e) => setEditingMetadataOrder({ ...editingMetadataOrder, buyer: e.target.value })}
                    className="w-full bg-[#fcfaf6] border border-[#ded5c2] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#23201c] focus:outline-none focus:border-[#c05c3b] shadow-inner"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#5c5549] block mb-1">Shop / Seller (Who is selling)</label>
                  <input
                    type="text"
                    value={editingMetadataOrder.seller || ''}
                    onChange={(e) => setEditingMetadataOrder({ ...editingMetadataOrder, seller: e.target.value })}
                    className="w-full bg-[#fcfaf6] border border-[#ded5c2] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#23201c] focus:outline-none focus:border-[#c05c3b] shadow-inner"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-bold text-[#5c5549] block mb-1">Order Status</label>
                  <select
                    value={editingMetadataOrder.status || 'unpaid'}
                    onChange={(e) => setEditingMetadataOrder({ ...editingMetadataOrder, status: e.target.value })}
                    className="w-full bg-[#fcfaf6] border border-[#ded5c2] rounded-xl px-3 py-2.5 text-xs font-bold text-[#23201c] focus:outline-none focus:border-[#c05c3b] shadow-inner cursor-pointer"
                  >
                    <option value="unpaid">⏳ Unpaid</option>
                    <option value="paid">💳 Paid</option>
                    <option value="completed">✅ Completed</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-[#5c5549] block mb-1">Order Date</label>
                  <input
                    type="date"
                    value={editingMetadataOrder.orderDate || ''}
                    onChange={(e) => setEditingMetadataOrder({ ...editingMetadataOrder, orderDate: e.target.value })}
                    className="w-full bg-[#fcfaf6] border border-[#ded5c2] rounded-xl px-3 py-2 text-xs text-[#23201c] focus:outline-none focus:border-[#c05c3b] shadow-inner"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-bold text-[#5c5549] block mb-1">Payment Confirmed Date</label>
                  <input
                    type="date"
                    value={editingMetadataOrder.paymentDate || ''}
                    onChange={(e) => setEditingMetadataOrder({ ...editingMetadataOrder, paymentDate: e.target.value })}
                    className="w-full bg-[#fcfaf6] border border-[#ded5c2] rounded-xl px-3 py-2 text-xs text-[#23201c] focus:outline-none focus:border-[#c05c3b] shadow-inner"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#5c5549] block mb-1">Planned Collection / Handover</label>
                  <input
                    type="date"
                    value={editingMetadataOrder.collectionDate || ''}
                    onChange={(e) => setEditingMetadataOrder({ ...editingMetadataOrder, collectionDate: e.target.value })}
                    className="w-full bg-[#fcfaf6] border border-[#ded5c2] rounded-xl px-3 py-2 text-xs text-[#23201c] focus:outline-none focus:border-[#c05c3b] shadow-inner"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#5c5549] block mb-1">Comment / Free Text Note</label>
                <textarea
                  rows="2"
                  placeholder="e.g. Paid via PayNow, meet up at Stadium Gate 3..."
                  value={editingMetadataOrder.comment || ''}
                  onChange={(e) => setEditingMetadataOrder({ ...editingMetadataOrder, comment: e.target.value })}
                  className="w-full bg-[#fcfaf6] border border-[#ded5c2] rounded-xl px-3.5 py-2 text-xs text-[#23201c] focus:outline-none focus:border-[#c05c3b] shadow-inner resize-none"
                />
              </div>

              <div className="flex items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => handleDeleteOrder(editingMetadataOrder.id, getMemberDisplayString(editingMetadataOrder))}
                  className="px-4 py-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs border border-red-200 transition active:scale-95 flex items-center justify-center gap-1.5 shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Sheet</span>
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-[#c05c3b] hover:bg-[#ab4e31] text-white font-bold text-sm shadow-md transition active:scale-95"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Item from Catalog Modal */}
      {addingCatalogToOrder && currentAddingOrder && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#23201c]/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white border border-[#ded5c2] rounded-3xl p-5 w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between mb-3 border-b border-[#eae3d2] pb-3">
              <div>
                <span className="text-[10px] font-extrabold uppercase text-[#c05c3b] block">Assign Merch</span>
                <h3 className="text-base font-black text-[#23201c] font-heading truncate">
                  For: {getMemberDisplayString(currentAddingOrder)}
                </h3>
              </div>
              <button
                onClick={() => setAddingCatalogToOrder(null)}
                className="p-1 text-[#8c8273] hover:text-[#23201c] rounded-xl bg-[#f4eee2]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 my-2">
              {/* Quick Create & Assign Box */}
              <div className="bg-[#fefaf3] border border-[#e8dfce] rounded-2xl p-3 mb-3 shadow-inner shrink-0">
                <div className="text-[11px] font-black uppercase text-[#c05c3b] tracking-wider mb-2 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#d97706]" />
                  <span>Key in New Item to Catalog</span>
                </div>
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="New Item Name (e.g. Karina PC, Album Bundle)"
                    value={quickNewItemName}
                    onChange={(e) => setQuickNewItemName(e.target.value)}
                    className="w-full bg-white border border-[#ded5c2] rounded-xl px-3 py-1.5 text-xs font-bold text-[#23201c] focus:outline-none focus:border-[#c05c3b] shadow-2xs"
                  />
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#8c8273]">{currencyCode}</span>
                      <input
                        type="number"
                        step="any"
                        placeholder="Price"
                        value={quickNewItemPrice}
                        onChange={(e) => setQuickNewItemPrice(e.target.value)}
                        className="w-full bg-white border border-[#ded5c2] rounded-xl pl-10 pr-2.5 py-1.5 text-xs font-mono font-bold text-[#23201c] focus:outline-none focus:border-[#c05c3b] shadow-2xs"
                      />
                    </div>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-[#5c5549] cursor-pointer bg-white px-2.5 py-1.5 rounded-xl border border-[#ded5c2] shrink-0">
                      <input
                        type="checkbox"
                        checked={quickNewItemPC}
                        onChange={(e) => setQuickNewItemPC(e.target.checked)}
                        className="rounded border-[#ded5c2] text-[#c05c3b] focus:ring-0 cursor-pointer"
                      />
                      <span>With PC?</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        if (!quickNewItemName.trim() || !quickNewItemPrice || !onUpdateCatalog) return;
                        const newItem = {
                          id: `item-${Date.now()}`,
                          name: quickNewItemName.trim(),
                          price: Number(quickNewItemPrice) || 0,
                          comesWithPC: quickNewItemPC,
                          countsTowardsBenefit: true,
                          displayOrder: catalog.length + 1,
                        };
                        onUpdateCatalog([...catalog, newItem]);
                        handleQuantityChange(currentAddingOrder.id, newItem.id, 1);
                        setQuickNewItemName('');
                        setQuickNewItemPrice('');
                        setQuickNewItemPC(false);
                      }}
                      disabled={!quickNewItemName.trim() || !quickNewItemPrice || !onUpdateCatalog}
                      className="px-3.5 py-1.5 bg-[#c05c3b] hover:bg-[#ab4e31] disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-xs transition active:scale-95 shrink-0 flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Add & Assign</span>
                    </button>
                  </div>
                </div>
              </div>

              {catalog.map((item) => {
                const qty = Object.entries(currentAddingOrder.items || {}).reduce(
                  (sum, [k, v]) => (k.split('__')[0] === item.id ? sum + Number(v || 0) : sum),
                  0
                );
                const existingKey = Object.keys(currentAddingOrder.items || {}).find((k) => k.split('__')[0] === item.id) || (item.size ? `${item.id}__${item.size}` : `${item.id}__`);

                return (
                  <div
                    key={item.id}
                    className={`p-3 rounded-2xl border transition flex items-center justify-between ${
                      qty > 0 ? 'bg-[#fef8f0] border-[#c05c3b]/60' : 'bg-[#fdfbf7] border-[#e6decb]'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-extrabold text-[#23201c] truncate">{item.name}</span>
                        {item.size && (
                          <span className="text-[9px] bg-[#f4eee2] text-[#5c5549] font-extrabold px-1.5 py-0.2 rounded border border-[#ded5c2] shrink-0">
                            {item.size}
                          </span>
                        )}
                        {item.comesWithPC !== false && (
                          <span className="text-[9px] bg-[#fef3c7] text-[#b45309] font-extrabold px-1.5 py-0.2 rounded border border-[#fde68a]">PC</span>
                        )}
                      </div>
                      <span className="text-xs font-mono text-[#716a5d]">
                        {formatCurrency(item.price, currencyCode)}
                      </span>
                    </div>

                    <div className="shrink-0">
                      {qty === 0 ? (
                        <button
                          onClick={() => handleQuantityChange(currentAddingOrder.id, existingKey, 1)}
                          className="px-3 py-1.5 rounded-xl bg-[#c05c3b] hover:bg-[#ab4e31] text-white text-xs font-bold transition flex items-center gap-1 shadow-xs active:scale-95"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Add</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleQuantityChange(currentAddingOrder.id, existingKey, -1)}
                            className="w-7 h-7 rounded-lg bg-[#f4eee2] border border-[#ded5c2] flex items-center justify-center text-[#23201c] active:scale-90"
                          >
                            <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
                          </button>
                          <span className="w-5 text-center font-mono font-black text-sm text-[#23201c]">
                            {qty}
                          </span>
                          <button
                            onClick={() => handleQuantityChange(currentAddingOrder.id, existingKey, 1)}
                            className="w-7 h-7 rounded-lg bg-[#c05c3b] text-white flex items-center justify-center shadow-xs active:scale-90"
                          >
                            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setAddingCatalogToOrder(null)}
              className="w-full py-3 rounded-xl bg-[#23201c] hover:bg-[#3d3730] text-white font-bold text-sm transition mt-2 shadow-md"
            >
              Done Assigning Items
            </button>
          </div>
        </div>
      )}

      {/* Generate Bill Modal */}
      {billingOrder && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#23201c]/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white border border-[#ded5c2] rounded-3xl p-6 w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl space-y-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#eae3d2] pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#fef3c7] border border-[#fde68a] flex items-center justify-center text-[#d97706] shadow-inner">
                  <Receipt className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#c05c3b] block">
                    Generate Invoice
                  </span>
                  <h3 className="text-lg font-black text-[#23201c] font-heading truncate">
                    Bill for: {getMemberDisplayString(billingOrder)}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setBillingOrder(null)}
                className="p-1.5 text-[#8c8273] hover:text-[#23201c] rounded-xl bg-[#f4eee2] transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Controls: Exchange Rate & Rounding */}
            <div className="bg-[#fcfaf6] border border-[#ded5c2] rounded-2xl p-4 space-y-3 shadow-inner">
              <div className="flex items-center justify-between gap-3">
                <label className="text-xs font-black text-[#5c5549] block">
                  Exchange Rate <span className="font-mono text-[#8c8273]">(1 {currencyCode} = ? SGD)</span>
                </label>
                <button
                  onClick={() => setBillExchangeRate(String(activeEvent?.exchangeRate || 1))}
                  className="text-[11px] font-bold text-[#c05c3b] hover:underline flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Reset to Default ({activeEvent?.exchangeRate || 1})</span>
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
            <div className="bg-gradient-to-r from-[#23201c] to-[#3d3730] text-white rounded-2xl p-4 flex items-center justify-between shadow-lg">
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
            <div className="space-y-2">
              <button
                onClick={() => handleSaveBillAmount(billBreakdown.finalTotalSgd)}
                disabled={billBreakdown.items.length === 0}
                className="w-full py-3 rounded-xl bg-[#059669] hover:bg-[#047857] text-white font-extrabold text-xs transition flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50"
              >
                <DollarSign className="w-4 h-4 stroke-[2.5]" />
                <span>Save Final Amount (${cleanSgd(billBreakdown.finalTotalSgd)} SGD) to Order Status</span>
              </button>

              {billingOrder.billedAmountSgd !== undefined && billingOrder.billedAmountSgd !== null && (
                <button
                  onClick={() => handleSaveBillAmount(null)}
                  className="w-full py-1.5 rounded-lg bg-[#f4eee2] hover:bg-[#ede5d6] text-[#716a5d] font-bold text-[11px] transition text-center"
                >
                  Current Saved: ${cleanSgd(billingOrder.billedAmountSgd)} SGD — (Click to Reset to Auto)
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
      )}
    </div>
  );
}
