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
  Gift
} from 'lucide-react';
import { formatCurrency } from '../utils/calculations';

export default function OrdersManager({
  activeEvent,
  processedOrders,
  summaryData = {},
  onUpdateOrders,
  onSetMyOrder,
}) {
  const catalog = activeEvent?.catalog || [];
  const currencyCode = activeEvent?.currencyCode || 'USD';

  const [showAddModal, setShowAddModal] = useState(false);
  const [expandedOrders, setExpandedOrders] = useState({});
  const [addingCatalogToOrder, setAddingCatalogToOrder] = useState(null);
  const [editingMetadataOrder, setEditingMetadataOrder] = useState(null);

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
            if (!map[itemId]) {
              map[itemId] = {
                id: itemId,
                name: item.name || 'Unknown Item',
                price: Number(item.price || 0),
                qty: 0,
                totalLocal: 0,
                totalSgd: 0,
              };
            }
            map[itemId].qty += quantity;
            map[itemId].totalLocal += Number(item.price || 0) * quantity;
            map[itemId].totalSgd = Number((map[itemId].totalLocal * rate).toFixed(2));
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

  const handleAddPerson = (e) => {
    e.preventDefault();
    if (!newOrderData.personName.trim() && newOrderData.orderType !== 'host') return;
    const isFirst = processedOrders.length === 0;
    const role = isFirst ? 'host' : newOrderData.orderType;
    const nameInput = newOrderData.personName.trim() || (role === 'host' ? 'Me' : 'Member');

    let buyer = nameInput;
    let seller = 'Me';

    if (role === 'placing') {
      buyer = 'Me';
      seller = nameInput;
    } else if (role === 'host') {
      buyer = 'Me';
      seller = 'Official Store';
    }

    const newOrder = {
      id: `ord-${Date.now()}`,
      personName: role === 'host' ? 'Me' : nameInput,
      buyer,
      seller,
      isMyOrder: isFirst || role === 'host',
      orderType: role,
      status: newOrderData.status || 'unpaid',
      orderDate: newOrderData.orderDate || new Date().toISOString().split('T')[0],
      paymentDate: newOrderData.paymentDate || '',
      collectionDate: newOrderData.collectionDate || '',
      comment: newOrderData.comment || '',
      items: {},
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
    });
    setShowAddModal(false);
    setExpandedOrders((prev) => ({ ...prev, [newOrder.id]: true }));
  };

  const handleDeleteOrder = (orderId, name) => {
    if (confirm(`Remove order sheet for "${name}"?`)) {
      onUpdateOrders(processedOrders.filter((o) => o.id !== orderId));
    }
  };

  const handleUpdateOrderMetadata = (e) => {
    e.preventDefault();
    if (!editingMetadataOrder) return;
    const updated = processedOrders.map((ord) => {
      if (ord.id === editingMetadataOrder.id) {
        const isHost = editingMetadataOrder.orderType === 'host';
        const role = editingMetadataOrder.orderType;
        const nameInput = editingMetadataOrder.personName.trim() || 'Me';

        let buyer = nameInput;
        let seller = 'Me';
        if (role === 'placing') {
          buyer = 'Me';
          seller = nameInput;
        } else if (role === 'host') {
          buyer = 'Me';
          seller = 'Official Store';
        }

        return {
          ...ord,
          personName: isHost ? 'Me' : nameInput,
          buyer,
          seller,
          orderType: role,
          isMyOrder: isHost,
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

  const handleQuantityChange = (orderId, itemId, delta) => {
    const updated = processedOrders.map((ord) => {
      if (ord.id === orderId) {
        const currentQty = Number(ord.items?.[itemId] || 0);
        const nextQty = Math.max(0, currentQty + delta);
        const newItems = { ...(ord.items || {}) };
        if (nextQty > 0) {
          newItems[itemId] = nextQty;
        } else {
          delete newItems[itemId];
        }
        return { ...ord, items: newItems };
      }
      return ord;
    });
    onUpdateOrders(updated);
  };

  const getRoleBadge = (ord) => {
    if (ord.isMyOrder || ord.orderType === 'host') {
      return { label: '👑 Host Anchor', color: 'bg-[#c05c3b] text-white' };
    }
    if (ord.orderType === 'placing') {
      return { label: '📤 Placing Order (Proxy)', color: 'bg-[#475569] text-white' };
    }
    return { label: '📥 Taking Order (Member)', color: 'bg-[#334155] text-slate-100' };
  };

  const currentAddingOrder = addingCatalogToOrder
    ? processedOrders.find((o) => o.id === addingCatalogToOrder.id)
    : null;

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4 pb-28">
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
            <div className="text-lg font-black text-[#23201c] font-mono mt-0.5">
              ${Number(totalSgd).toFixed(2)} SGD
            </div>
            <span className="text-[11px] font-bold text-[#8c8273] block mt-0.5">
              {formatCurrency(totalLocal, currencyCode)}
            </span>
          </div>

          <div className="bg-white/90 border border-[#ded5c2] rounded-2xl p-3 shadow-2xs">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#b45309] flex items-center gap-1">
              <Gift className="w-3.5 h-3.5 text-[#d97706]" />
              <span>Total Benefits Earned</span>
            </span>
            <div className="text-lg font-black text-[#b45309] font-mono mt-0.5 flex items-center gap-1">
              <Sparkles className="w-4 h-4 text-[#d97706]" />
              <span>{Number(totalEffectivePCs || 0).toFixed(1)} PCs</span>
            </div>
            <span className="text-[11px] font-semibold text-[#8c8273] block mt-0.5">
              Across {totalItemsCount} items
            </span>
          </div>
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
                    <span className="font-extrabold text-[#23201c] block truncate">
                      {data.qty}x {data.name}
                    </span>
                  </div>
                  <div className="text-right shrink-0 font-mono">
                    <span className="font-bold text-[#c05c3b] block">
                      ${Number(data.totalSgd).toFixed(2)} SGD
                    </span>
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
              ${Number(totalSgd).toFixed(2)} SGD ({formatCurrency(totalLocal, currencyCode)})
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
          onClick={() => setShowAddModal(true)}
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
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-xl bg-[#f4eee2] hover:bg-[#ede5d6] text-xs font-bold text-[#3d3730] transition inline-block border border-[#ded5c2]"
          >
            + Add First Order Sheet
          </button>
        </div>
      ) : (
        <div className="space-y-3.5">
          {processedOrders.map((ord) => {
            const isExpanded = expandedOrders[ord.id] !== false;
            const orderedCatalogItems = catalog.filter((item) => Number(ord.items?.[item.id] || 0) > 0);
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
                        {renderNameWithMeHighlight(ord.personName, 'Me')}
                      </h3>
                    </div>

                    <div className="flex items-center flex-wrap gap-x-2.5 gap-y-1 text-xs pt-0.5">
                      <span className="font-mono font-extrabold text-[#3d3730]">
                        {formatCurrency(ord.orderLocalSpend, currencyCode)}
                      </span>
                      <span className="text-[#a89f91]">•</span>
                      <span className="font-mono font-black text-[#c05c3b]">
                        ${ord.orderSgdSpend} SGD
                      </span>
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
                    <div className="bg-[#fcfaf6] border border-[#ded5c2] px-2.5 py-1.5 rounded-xl text-right shadow-inner">
                      <div className="text-[10px] uppercase font-bold text-[#8c8273]">Benefit</div>
                      <div className="text-sm font-black text-[#b45309] flex items-center justify-end gap-1 font-mono">
                        <Sparkles className="w-3.5 h-3.5 text-[#d97706]" />
                        <span>{Number(ord.effectiveBenefit || 0).toFixed(1)} PC</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingMetadataOrder({ ...ord })}
                        className="p-1.5 text-[#8c8273] hover:text-[#c05c3b] transition"
                        title="Edit order sheet info & notes"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteOrder(ord.id, ord.personName)}
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
                        Remainder contribution: <strong className="font-mono">.{Math.round(ord.remainder * 100).toString().padStart(2, '0')}</strong>
                      </span>
                    )}
                  </div>
                </div>

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

                    {orderedCatalogItems.length === 0 ? (
                      <div className="p-4 rounded-xl border border-dashed border-[#ded5c2] text-center bg-[#fcfaf6]">
                        <ShoppingBag className="w-6 h-6 text-[#b4a997] mx-auto mb-1 stroke-1" />
                        <p className="text-xs font-semibold text-[#5c5549]">No items assigned yet</p>
                        <p className="text-[11px] text-[#8c8273]">Tap "+ Add Item from Catalog" above to select merch</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {orderedCatalogItems.map((item) => {
                          const qty = Number(ord.items?.[item.id] || 0);
                          const itemTotalLocal = qty * item.price;

                          return (
                            <div
                              key={item.id}
                              className="p-2.5 rounded-xl bg-[#fef8f0] border border-[#c05c3b]/40 shadow-xs flex items-center justify-between"
                            >
                              <div className="min-w-0 pr-2">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-extrabold text-[#23201c] truncate">
                                    {item.name}
                                  </span>
                                  {item.comesWithPC !== false && (
                                    <span className="text-[9px] bg-[#fef3c7] text-[#b45309] font-extrabold px-1.5 py-0.2 rounded border border-[#fde68a]">PC</span>
                                  )}
                                </div>
                                <span className="text-[11px] font-mono text-[#716a5d] block mt-0.5">
                                  {formatCurrency(item.price, currencyCode)} each
                                  <strong className="text-[#c05c3b] ml-2 font-bold">
                                    (Subtotal: {formatCurrency(itemTotalLocal, currencyCode)})
                                  </strong>
                                </span>
                              </div>

                              {/* Stepper Control */}
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  onClick={() => handleQuantityChange(ord.id, item.id, -1)}
                                  className="w-7 h-7 rounded-lg bg-[#f4eee2] hover:bg-[#ede5d6] border border-[#ded5c2] flex items-center justify-center text-[#23201c] transition active:scale-90"
                                  aria-label="Decrease quantity"
                                >
                                  <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
                                </button>
                                <span className="w-6 text-center font-mono font-black text-sm text-[#23201c]">
                                  {qty}
                                </span>
                                <button
                                  onClick={() => handleQuantityChange(ord.id, item.id, 1)}
                                  className="w-7 h-7 rounded-lg bg-[#c05c3b] hover:bg-[#ab4e31] flex items-center justify-center text-white transition active:scale-90 shadow-sm shadow-[#c05c3b]/30"
                                  aria-label="Increase quantity"
                                >
                                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                                </button>
                                <button
                                  onClick={() => handleQuantityChange(ord.id, item.id, -qty)}
                                  className="p-1.5 ml-1 text-[#a89f91] hover:text-red-600 transition"
                                  title="Remove item"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
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
                    ? 'Seller / Proxy Handle (Who you ordered from)'
                    : newOrderData.orderType === 'host'
                    ? 'My Handle / Name'
                    : 'Buyer Name / Handle'}
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder={
                    newOrderData.orderType === 'placing'
                      ? 'e.g. Seoul Runner Proxy (@kr_proxy)'
                      : newOrderData.orderType === 'host'
                      ? 'Me'
                      : 'e.g. Minji K. (@minji_merch)'
                  }
                  value={newOrderData.personName}
                  onChange={(e) => setNewOrderData({ ...newOrderData, personName: e.target.value })}
                  className="w-full bg-[#fcfaf6] border border-[#ded5c2] rounded-xl px-3.5 py-2.5 text-sm text-[#23201c] focus:outline-none focus:border-[#c05c3b] shadow-inner"
                />
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
                <label className="text-xs font-bold text-[#5c5549] block mb-1">Handle / Person Name</label>
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

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-[#c05c3b] hover:bg-[#ab4e31] text-white font-bold text-sm shadow-md transition active:scale-95 mt-2"
              >
                Save Changes
              </button>
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
                  For: {currentAddingOrder.personName}
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
              {catalog.map((item) => {
                const qty = Number(currentAddingOrder.items?.[item.id] || 0);

                return (
                  <div
                    key={item.id}
                    className={`p-3 rounded-2xl border transition flex items-center justify-between ${
                      qty > 0 ? 'bg-[#fef8f0] border-[#c05c3b]/60' : 'bg-[#fdfbf7] border-[#e6decb]'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-extrabold text-[#23201c] truncate">{item.name}</span>
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
                          onClick={() => handleQuantityChange(currentAddingOrder.id, item.id, 1)}
                          className="px-3 py-1.5 rounded-xl bg-[#c05c3b] hover:bg-[#ab4e31] text-white text-xs font-bold transition flex items-center gap-1 shadow-xs active:scale-95"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Add</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleQuantityChange(currentAddingOrder.id, item.id, -1)}
                            className="w-7 h-7 rounded-lg bg-[#f4eee2] border border-[#ded5c2] flex items-center justify-center text-[#23201c] active:scale-90"
                          >
                            <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
                          </button>
                          <span className="w-5 text-center font-mono font-black text-sm text-[#23201c]">
                            {qty}
                          </span>
                          <button
                            onClick={() => handleQuantityChange(currentAddingOrder.id, item.id, 1)}
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
    </div>
  );
}
