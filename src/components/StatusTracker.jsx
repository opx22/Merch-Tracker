import React, { useState, useMemo } from 'react';
import {
  Users, CreditCard, Package, CheckCircle, Clock, Calendar, ShoppingBag, Filter, Truck, Globe, AlertCircle, DollarSign, Edit3, MessageSquare, Plus, Trash2, X, Tag
} from 'lucide-react';
import { calculateEventSummary, formatCurrency } from '../utils/calculations';
import BillModal from './BillModal';

const MultiSelect = ({ options, value, onChange, placeholder, icon: Icon, iconColor, widthClass = "w-48" }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef(null);
  
  React.useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (optVal) => {
    if (value.includes(optVal)) {
      onChange(value.filter(v => v !== optVal));
    } else {
      onChange([...value, optVal]);
    }
  };

  const isAll = value.length === 0;
  const label = isAll ? placeholder : (value.length === 1 ? options.find(o => o.val === value[0])?.label : `${value.length} selected`);

  return (
    <div ref={dropdownRef} className="relative h-8 flex items-center bg-[#f8f5ed] border border-[#e2d6c1] rounded-xl shrink-0 cursor-pointer">
      <button type="button" onClick={() => setIsOpen(!isOpen)} className="px-2.5 flex items-center gap-1.5 h-full focus:outline-none rounded-xl">
        <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
        <span className="text-xs font-extrabold text-[#23201c] whitespace-nowrap">{label}</span>
      </button>
      {isOpen && (
        <div className={`absolute top-full mt-1 left-0 ${widthClass} bg-white border border-[#ded5c2] rounded-xl shadow-lg z-50 py-1 max-h-60 overflow-y-auto`}>
          <div className="px-3 py-1.5 border-b border-[#ded5c2]">
            <button type="button" onClick={() => onChange([])} className="text-[10px] font-bold text-[#c05c3b] hover:underline">Clear (Select All)</button>
          </div>
          {options.map(opt => (
            <label key={opt.val} className="flex items-center gap-2 px-3 py-1.5 hover:bg-[#f8f5ed] cursor-pointer">
              <input type="checkbox" checked={value.includes(opt.val)} onChange={() => toggleOption(opt.val)} className="rounded border-gray-300 text-[#c05c3b] focus:ring-[#c05c3b]" />
              <span className="text-xs font-bold text-[#23201c] whitespace-nowrap">{opt.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

export default function StatusTracker({ events = [], ordersMap = {}, activeEventId, onUpdateOrdersForEvent }) {
  const [selectedEventFilter, setSelectedEventFilter] = useState('ALL');
  const [activityTypeFilter, setActivityTypeFilter] = useState([]);
  const [statusFilter, setStatusFilter] = useState(['unpaid', 'paid', 'ordered', 'shipped', 'listed', 'reserved']);
  const [buyerFilter, setBuyerFilter] = useState([]);
  const [sellerFilter, setSellerFilter] = useState([]);
  const [eraFilter, setEraFilter] = useState([]);
  const [memberFilter, setMemberFilter] = useState([]);
  const [paymentYearFilter, setPaymentYearFilter] = useState([]);
  const [editingOrder, setEditingOrder] = useState(null);
  const [billingOrder, setBillingOrder] = useState(null);
  
  const [showAddPurchaseModal, setShowAddPurchaseModal] = useState(false);
  const [newPurchaseRows, setNewPurchaseRows] = useState([{ title: '', seller: '', amountSgd: '', era: '', member: '' }]);
  const [newPurchaseEventId, setNewPurchaseEventId] = useState('standalone_activities');

  const [showAddSaleModal, setShowAddSaleModal] = useState(false);
  const [newSaleRows, setNewSaleRows] = useState([{ title: '', buyer: '', amountSgd: '', era: '', member: '' }]);

  // Build a global list of processed orders enriched with Event metadata
  const allProcessedOrders = useMemo(() => {
    const list = [];
    events.forEach((evt) => {
      const rawOrders = ordersMap[evt.id] || [];
      const summary = calculateEventSummary(evt, rawOrders);
      (summary.processedOrders || []).forEach((ord) => {
        let tooltipText = '';
        if (ord.activityType === 'purchase' || ord.activityType === 'sale') {
           // Skip tooltip for standalone types that might be inside events
           tooltipText = '';
        } else if (ord.billedAmountSgd !== undefined && ord.billedAmountSgd !== null && ord.billedAmountSgd !== '') {
          tooltipText = `Manually set amount: SGD ${Number(ord.billedAmountSgd).toFixed(2)}`;
        } else {
          const itemLines = [];
          Object.entries(ord.items || {}).forEach(([compositeKey, qty]) => {
            const quantity = Number(qty);
            if (quantity > 0) {
              const [itemId] = compositeKey.split('__');
              const item = (evt.catalog || []).find(c => c.id === itemId);
              if (item) {
                itemLines.push(`${quantity}x ${item.name} @ ${item.price} ${evt.currencyCode}`);
              }
            }
          });
          if (itemLines.length > 0) {
            tooltipText = `Itemized Breakdown:\n${itemLines.join('\n')}\n---\nTotal: ${ord.orderLocalSpend} ${evt.currencyCode} (≈ ${ord.orderSgdSpend} SGD)`;
          } else {
            tooltipText = `No items selected`;
          }
        }
        list.push({ ...ord, era: ord.era || evt.era, member: ord.member || evt.member, eventId: evt.id, eventName: evt.name, currencyCode: evt.currencyCode || 'USD', tooltipText });
      });
    });

    const standaloneOrders = ordersMap['standalone_activities'] || [];
    standaloneOrders.forEach((ord) => {
      list.push({
        ...ord,
        orderSgdSpend: ord.billedAmountSgd || 0,
        orderLocalSpend: ord.billedAmountSgd || 0,
        eventId: 'standalone_activities',
        eventName: '📦 Standalone Activities',
        currencyCode: 'SGD',
      });
    });

    return list;
  }, [events, ordersMap]);

  const filterOptions = useMemo(() => {
    const eras = new Set();
    const members = new Set();
    const years = new Set();
    const sellers = new Set();
    
    allProcessedOrders.forEach(o => {
      if (o.era) eras.add(o.era);
      if (o.member) members.add(o.member);
      if (o.paymentDate) years.add(o.paymentDate.substring(0, 4));
      if (o.seller) sellers.add(o.seller);
    });
    
    return {
      eras: Array.from(eras).sort(),
      members: Array.from(members).sort(),
      years: Array.from(years).sort().reverse(),
      sellers: Array.from(sellers).sort(),
    };
  }, [allProcessedOrders]);

  const eventFilteredOrders = useMemo(() => {
    let res = allProcessedOrders;
    if (selectedEventFilter !== 'ALL') res = res.filter((o) => o.eventId === selectedEventFilter);
    if (activityTypeFilter.length > 0) res = res.filter((o) => activityTypeFilter.includes(o.activityType || 'go'));
    if (eraFilter.length > 0) res = res.filter((o) => eraFilter.includes(o.era));
    if (memberFilter.length > 0) res = res.filter((o) => memberFilter.includes(o.member));
    if (paymentYearFilter.length > 0) res = res.filter((o) => o.paymentDate && paymentYearFilter.includes(o.paymentDate.substring(0, 4)));
    if (sellerFilter.length > 0) res = res.filter((o) => sellerFilter.includes(o.seller));
    return res;
  }, [allProcessedOrders, selectedEventFilter, activityTypeFilter, eraFilter, memberFilter, paymentYearFilter, sellerFilter]);

  const uniqueBuyers = useMemo(() => {
    const set = new Set();
    eventFilteredOrders.forEach((o) => {
      const b = (o.buyer || o.personName || 'Me').trim();
      if (b) set.add(b);
    });
    return Array.from(set).sort((a, b) => {
      if (a.toLowerCase() === 'me') return -1;
      if (b.toLowerCase() === 'me') return 1;
      return a.localeCompare(b);
    });
  }, [eventFilteredOrders]);

  // Final Filter
  const finalDisplayedOrders = useMemo(() => {
    return eventFilteredOrders.filter((o) => {
      const stat = o.status || 'unpaid';
      const matchesStatus = statusFilter.length === 0 || statusFilter.includes(stat);
      const b = (o.buyer || o.personName || 'Me').trim();
      const matchesBuyer = buyerFilter.length === 0 || buyerFilter.includes(b);
      return matchesStatus && matchesBuyer;
    });
  }, [eventFilteredOrders, statusFilter, buyerFilter]);

  const receivablesOverview = useMemo(() => {
    let owedToMeSgd = 0, owedCount = 0;
    let totalPaidSgd = 0;
    let pendingShipments = 0;

    eventFilteredOrders.forEach((ord) => {
      const act = ord.activityType || 'go';
      const stat = ord.status || 'unpaid';
      const amt = Number(ord.orderSgdSpend || ord.billedAmountSgd || 0);
      
      if (act === 'go') {
        if (stat !== 'paid' && stat !== 'completed' && stat !== 'shipped' && ord.orderType === 'taking') {
          owedToMeSgd += amt;
          owedCount++;
        }
        if (stat !== 'unpaid' && (ord.orderType === 'host' || ord.isMyOrder || ord.buyer === 'Me')) {
          totalPaidSgd += amt;
        }
      } else if (act === 'purchase') {
        if (stat !== 'unpaid') {
          totalPaidSgd += amt;
        }
      } else if (act === 'sale') {
        if (stat !== 'paid' && stat !== 'completed' && stat !== 'shipped') {
          owedToMeSgd += amt;
          owedCount++;
        }
        if (stat === 'paid' || stat === 'reserved') {
          pendingShipments++;
        }
      }
    });

    return { owedToMeSgd: owedToMeSgd.toFixed(2), owedCount, totalPaidSgd: totalPaidSgd.toFixed(2), pendingShipments };
  }, [eventFilteredOrders]);

  const handleStatusChange = (orderId, eventId, nextStatus) => {
    const updated = (ordersMap[eventId] || []).map((ord) => {
      if (ord.id === orderId) {
        const payDate = (nextStatus === 'paid' || nextStatus === 'completed') && !ord.paymentDate
          ? new Date().toISOString().split('T')[0]
          : ord.paymentDate;
        return { ...ord, status: nextStatus, paymentDate: payDate };
      }
      return ord;
    });
    onUpdateOrdersForEvent(eventId, updated);
  };

  const handleCommentChange = (orderId, eventId, newComment) => {
    const updated = (ordersMap[eventId] || []).map((ord) => ord.id === orderId ? { ...ord, comment: newComment } : ord);
    onUpdateOrdersForEvent(eventId, updated);
  };

  const handleSaveModalEdit = (e) => {
    e.preventDefault();
    if (!editingOrder) return;
    
    const oldEventId = editingOrder.originalEventId || editingOrder.eventId || 'standalone_activities';
    const newEventId = editingOrder.eventId || 'standalone_activities';

    const updatedOrder = {
      ...editingOrder,
      personName: editingOrder.personName || 'Me',
      buyer: editingOrder.buyer,
      seller: editingOrder.seller,
      status: editingOrder.status,
      orderDate: editingOrder.orderDate,
      paymentDate: editingOrder.paymentDate,
      collectionDate: editingOrder.collectionDate,
      comment: editingOrder.comment || '',
      itemDescription: editingOrder.itemDescription || '',
      era: editingOrder.era || '',
      member: editingOrder.member || '',
      billedAmountSgd: editingOrder.billedAmountSgd,
    };
    delete updatedOrder.originalEventId;
    delete updatedOrder.tooltipText;

    if (oldEventId !== newEventId) {
      const oldList = (ordersMap[oldEventId] || []).filter(ord => ord.id !== editingOrder.id);
      onUpdateOrdersForEvent(oldEventId, oldList);
      
      const newList = [...(ordersMap[newEventId] || []), updatedOrder];
      onUpdateOrdersForEvent(newEventId, newList);
    } else {
      const updated = (ordersMap[newEventId] || []).map((ord) => {
        if (ord.id === editingOrder.id) return updatedOrder;
        return ord;
      });
      onUpdateOrdersForEvent(newEventId, updated);
    }
    setEditingOrder(null);
  };

  const handleCreatePurchase = (e) => {
    e.preventDefault();
    const evtId = newPurchaseEventId;
    const newOrders = [];
    newPurchaseRows.forEach((row, idx) => {
      if (!row.title.trim()) return;
      newOrders.push({
        id: `ord_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 4)}`,
        activityType: 'purchase',
        itemDescription: row.title.trim(),
        personName: 'Me',
        buyer: 'Me',
        seller: row.seller.trim() || 'General Shop',
        isMyOrder: true,
        orderType: 'host',
        status: 'paid',
        orderDate: new Date().toISOString().split('T')[0],
        paymentDate: new Date().toISOString().split('T')[0],
        comment: '',
        era: row.era || '',
        member: row.member || '',
        billedAmountSgd: Number(row.amountSgd) || 0,
        items: {}, itemSizes: {},
      });
    });
    if (newOrders.length === 0) return;
    onUpdateOrdersForEvent(evtId, [...(ordersMap[evtId] || []), ...newOrders]);
    setShowAddPurchaseModal(false);
    setNewPurchaseRows([{ title: '', seller: '', amountSgd: '', era: '', member: '' }]);
    setNewPurchaseEventId('standalone_activities');
  };

  const handleCreateSale = (e) => {
    e.preventDefault();
    const newOrders = [];
    newSaleRows.forEach((row, idx) => {
      if (!row.title.trim()) return;
      newOrders.push({
        id: `ord_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 4)}`,
        activityType: 'sale',
        itemDescription: row.title.trim(),
        personName: row.buyer.trim() || 'Buyer',
        buyer: row.buyer.trim() || 'Buyer',
        seller: 'Me',
        isMyOrder: false,
        orderType: 'taking',
        status: 'listed',
        orderDate: new Date().toISOString().split('T')[0],
        comment: '',
        era: row.era || '',
        member: row.member || '',
        billedAmountSgd: Number(row.amountSgd) || 0,
        items: {}, itemSizes: {},
      });
    });
    if (newOrders.length === 0) return;
    onUpdateOrdersForEvent('standalone_activities', [...(ordersMap['standalone_activities'] || []), ...newOrders]);
    setShowAddSaleModal(false);
    setNewSaleRows([{ title: '', buyer: '', amountSgd: '', era: '', member: '' }]);
  };

  const getStatusBadge = (status, actType) => {
    switch (status) {
      case 'paid': return { label: 'Paid', color: 'bg-blue-500/15 text-blue-700', icon: CreditCard };
      case 'completed': return { label: 'Completed', color: 'bg-emerald-500/15 text-emerald-700', icon: CheckCircle };
      case 'ordered': return { label: 'Ordered', color: 'bg-indigo-500/15 text-indigo-700', icon: Package };
      case 'shipped': return { label: 'Shipped', color: 'bg-teal-500/15 text-teal-700', icon: Truck };
      case 'received': return { label: 'Received', color: 'bg-emerald-500/15 text-emerald-700', icon: CheckCircle };
      case 'listed': return { label: 'Listed', color: 'bg-purple-500/15 text-purple-700', icon: Tag };
      case 'reserved': return { label: 'Reserved', color: 'bg-orange-500/15 text-orange-700', icon: Clock };
      default: return { label: 'Unpaid', color: 'bg-amber-500/15 text-amber-800', icon: Clock };
    }
  };

  const getRoleBadge = (ord) => {
    const act = ord.activityType || 'go';
    if (act === 'purchase') return { label: '🛒 My Purchase', color: 'bg-[#475569] text-white' };
    if (act === 'sale') return { label: '💰 My Sale', color: 'bg-[#059669] text-white' };
    if (ord.isMyOrder || ord.orderType === 'host') return { label: '👑 Host Anchor', color: 'bg-[#c05c3b] text-white' };
    return { label: '📥 GO Member', color: 'bg-[#334155] text-slate-100' };
  };

  const getStatusOptions = (actType) => {
    if (actType === 'purchase') {
      return [
        { val: 'unpaid', label: '⏳ Unpaid' },
        { val: 'paid', label: '💳 Paid' },
        { val: 'shipped', label: '🚚 Shipped' },
        { val: 'received', label: '✅ Received' },
      ];
    }
    if (actType === 'sale') {
      return [
        { val: 'listed', label: '🏷️ Listed' },
        { val: 'reserved', label: '⏳ Reserved' },
        { val: 'paid', label: '💳 Paid' },
        { val: 'shipped', label: '🚚 Shipped' },
        { val: 'completed', label: '✅ Completed' },
      ];
    }
    return [
      { val: 'unpaid', label: '⏳ Unpaid' },
      { val: 'paid', label: '💳 Paid' },
      { val: 'completed', label: '✅ Completed' },
    ];
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 space-y-4 pb-28">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-black font-heading text-[#23201c]">Fulfillment & Receivables</h2>
          <p className="text-xs text-[#716a5d]">Unified dashboard for GOs, Purchases, and Stock Sales.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowAddSaleModal(true)} className="px-3 py-2 bg-[#059669] hover:bg-[#047857] text-white rounded-xl text-xs font-black transition flex items-center gap-1 shadow-md">
            <Tag className="w-4 h-4" /> Add Sale
          </button>
          <button onClick={() => setShowAddPurchaseModal(true)} className="px-3 py-2 bg-[#475569] hover:bg-[#334155] text-white rounded-xl text-xs font-black transition flex items-center gap-1 shadow-md">
            <ShoppingBag className="w-4 h-4" /> Add Purchase
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <div className="glass-card rounded-2xl p-3 border border-[#e2d6c1] bg-gradient-to-br from-[#fefaf3] to-[#fff]">
          <span className="text-[10px] font-extrabold uppercase text-[#b45309] flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5" /> Receivables
          </span>
          <div className="text-lg font-black text-[#23201c] font-mono mt-0.5">${receivablesOverview.owedToMeSgd}</div>
          <span className="text-[10px] text-[#716a5d]">{receivablesOverview.owedCount} unpaid members</span>
        </div>
        <div className="glass-card rounded-2xl p-3 border border-[#ded5c2] bg-[#fdfbf7]">
          <span className="text-[10px] font-extrabold uppercase text-[#475569] flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> Total Paid
          </span>
          <div className="text-lg font-black text-[#334155] font-mono mt-0.5">${receivablesOverview.totalPaidSgd}</div>
          <span className="text-[10px] text-[#716a5d]">Paid purchases</span>
        </div>
        <div className="glass-card rounded-2xl p-3 border border-[#ded5c2] bg-[#fdfbf7]">
          <span className="text-[10px] font-extrabold uppercase text-[#059669] flex items-center gap-1">
            <Truck className="w-3.5 h-3.5" /> Pending Shipments
          </span>
          <div className="text-lg font-black text-[#065f46] font-mono mt-0.5">{receivablesOverview.pendingShipments} sales</div>
          <span className="text-[10px] text-[#716a5d]">Paid but not shipped</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 bg-white/90 border border-[#ded5c2] rounded-2xl p-2 shadow-2xs">
        <MultiSelect 
          icon={Filter} iconColor="text-[#c05c3b]"
          placeholder="All Activities"
          value={activityTypeFilter} onChange={setActivityTypeFilter}
          options={[
            { val: 'go', label: 'GO Orders' },
            { val: 'purchase', label: 'My Purchases' },
            { val: 'sale', label: 'My Sales' }
          ]}
        />
        
        <MultiSelect 
          icon={Filter} iconColor="text-[#b45309]"
          placeholder="All Statuses"
          value={statusFilter} onChange={setStatusFilter}
          options={[
            { val: 'unpaid', label: 'Unpaid' },
            { val: 'paid', label: 'Paid' },
            { val: 'ordered', label: 'Ordered' },
            { val: 'shipped', label: 'Shipped' },
            { val: 'received', label: 'Received' },
            { val: 'completed', label: 'Completed' },
            { val: 'listed', label: 'Listed' },
            { val: 'reserved', label: 'Reserved' },
          ]}
        />

        <MultiSelect 
          icon={Tag} iconColor="text-[#5c5549]"
          placeholder="All Eras"
          value={eraFilter} onChange={setEraFilter}
          options={filterOptions.eras.map(e => ({ val: e, label: e }))}
        />

        <MultiSelect 
          icon={Users} iconColor="text-[#5c5549]"
          placeholder="All Members"
          value={memberFilter} onChange={setMemberFilter}
          options={filterOptions.members.map(m => ({ val: m, label: m }))}
        />

        <MultiSelect 
          icon={ShoppingBag} iconColor="text-[#5c5549]"
          placeholder="All Sellers"
          value={sellerFilter} onChange={setSellerFilter}
          options={filterOptions.sellers.map(s => ({ val: s, label: s }))}
        />

        <MultiSelect 
          icon={Calendar} iconColor="text-[#5c5549]"
          placeholder="All Years"
          value={paymentYearFilter} onChange={setPaymentYearFilter}
          options={filterOptions.years.map(y => ({ val: y, label: y }))}
        />
      </div>

      {finalDisplayedOrders.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center border border-[#ded5c2]">
          <p className="text-sm font-bold text-[#23201c]">No sheets matching current filters</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#ded5c2] shadow-xs overflow-hidden overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[750px]">
            <thead>
              <tr className="bg-[#fcfaf6] border-b border-[#ded5c2] text-[10px] font-black uppercase text-[#716a5d]">
                <th className="py-3 px-3">Item / Member</th>
                <th className="py-3 px-2.5">Parties</th>
                <th className="py-3 px-2.5">Status</th>
                <th className="py-3 px-2.5">Dates</th>
                <th className="py-3 px-3">Notes</th>
                <th className="py-3 px-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eae3d2] text-xs">
              {finalDisplayedOrders.map((ord) => {
                const act = ord.activityType || 'go';
                const roleBadge = getRoleBadge(ord);
                const statusBadge = getStatusBadge(ord.status, act);
                const StatusIcon = statusBadge.icon;
                const statusOpts = getStatusOptions(act);
                const itemDesc = act === 'go' ? ord.eventName : (ord.itemDescription || 'Unknown Item');

                return (
                  <tr key={`${ord.eventId}-${ord.id}`} className="hover:bg-[#fefaf3]/60 transition">
                    <td className="py-3 px-3 align-top">
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${roleBadge.color} inline-block mb-1`}>{roleBadge.label}</span>
                      <div className="text-sm font-bold text-[#23201c] max-w-[150px] leading-tight">{itemDesc}</div>
                      {(ord.era || ord.member) && (
                        <div className="text-[10px] text-[#716a5d] mt-1 font-bold space-x-2">
                          {ord.era && <span>Era: {ord.era}</span>}
                          {ord.member && <span>Member: {ord.member}</span>}
                        </div>
                      )}
                      {act === 'go' && <div className="text-[10px] text-[#716a5d] mt-1">{ord.personName} ({ord.totalItemsCount} items)</div>}
                      {act !== 'go' && ord.eventId !== 'standalone_activities' && <div className="text-[9px] text-[#a89f91] mt-1 truncate max-w-[150px]">🔗 {ord.eventName}</div>}
                    </td>
                    <td className="py-3 px-2.5 align-top font-mono text-[10px]">
                      <div className="bg-[#f8f5ed] border border-[#ded5c2] rounded-lg p-1.5 max-w-[130px]">
                        <div className="truncate"><strong className="text-[#5c5549]">B:</strong> {ord.buyer || 'Me'}</div>
                        <div className="truncate"><strong className="text-[#5c5549]">S:</strong> {ord.seller || 'Me'}</div>
                      </div>
                    </td>
                    <td className="py-3 px-2.5 align-top">
                      <select
                        value={ord.status || 'unpaid'}
                        onChange={(e) => handleStatusChange(ord.id, ord.eventId, e.target.value)}
                        className={`appearance-none cursor-pointer pl-2 pr-5 py-1 rounded-lg text-[11px] font-black border focus:outline-none ${statusBadge.color}`}
                      >
                        {statusOpts.map(opt => <option key={opt.val} value={opt.val}>{opt.label}</option>)}
                      </select>
                    </td>
                    <td className="py-3 px-2.5 align-top font-mono text-[9px] space-y-1 text-[#5c5549]">
                      <div>Ord: {ord.orderDate || 'N/A'}</div>
                      {ord.paymentDate && <div>Pay: {ord.paymentDate}</div>}
                    </td>
                    <td className="py-3 px-3 align-top">
                      <input
                        type="text" placeholder="Add comment..." value={ord.comment || ''}
                        onChange={(e) => handleCommentChange(ord.id, ord.eventId, e.target.value)}
                        className="w-full min-w-[120px] bg-transparent border-b border-transparent hover:border-[#ded5c2] focus:border-[#c05c3b] py-1 text-[11px] text-[#23201c] focus:outline-none"
                      />
                    </td>
                    <td className="py-3 px-3 align-top text-right">
                      <div className="text-sm font-black text-[#c05c3b] cursor-help underline decoration-dashed decoration-[#ded5c2] underline-offset-4" title={ord.tooltipText}>${Number(ord.orderSgdSpend || ord.billedAmountSgd || 0).toFixed(2)}</div>
                      <button onClick={() => setEditingOrder({ ...ord, originalEventId: ord.eventId || 'standalone_activities' })} className="mt-2 text-[10px] font-bold text-[#716a5d] hover:text-[#c05c3b] underline">Edit</button>
                      {act === 'go' && !ord.isMyOrder && (
                        <button onClick={() => setBillingOrder(ord)} className="mt-2 ml-2 text-[10px] font-bold text-[#716a5d] hover:text-[#059669] underline">Bill</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Order Modal */}
      {editingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#23201c]/50 backdrop-blur-sm p-4">
          <div className="bg-white border border-[#ded5c2] rounded-3xl p-5 w-full max-w-md shadow-2xl space-y-4">
            <h3 className="text-lg font-black text-[#23201c]">Edit Entry</h3>
            <form onSubmit={handleSaveModalEdit} className="space-y-3">
              {(editingOrder.activityType === 'purchase' || editingOrder.activityType === 'sale') && (
                <>
                  <div>
                    <label className="text-xs font-bold text-[#5c5549]">Event / Group Order</label>
                    <select 
                      value={editingOrder.eventId || 'standalone_activities'} 
                      onChange={(e) => setEditingOrder({ ...editingOrder, eventId: e.target.value })} 
                      className="w-full bg-[#fcfaf6] border border-[#ded5c2] rounded-xl px-3 py-2 text-xs font-bold mb-3"
                    >
                      <option value="standalone_activities">No Event (Standalone)</option>
                      {events.filter(evt => evt.id !== 'standalone_activities' && evt.id !== 'standalone').map(evt => (
                        <option key={evt.id} value={evt.id}>{evt.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#5c5549]">Item Description</label>
                    <input type="text" required value={editingOrder.itemDescription || ''} onChange={(e) => setEditingOrder({ ...editingOrder, itemDescription: e.target.value })} className="w-full bg-[#fcfaf6] border border-[#ded5c2] rounded-xl px-3 py-2 text-sm font-bold" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-bold text-[#5c5549]">Era</label>
                      <input type="text" value={editingOrder.era || ''} onChange={(e) => setEditingOrder({ ...editingOrder, era: e.target.value })} className="w-full bg-[#fcfaf6] border border-[#ded5c2] rounded-xl px-3 py-2 text-xs" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-[#5c5549]">Member (Idol)</label>
                      <input type="text" value={editingOrder.member || ''} onChange={(e) => setEditingOrder({ ...editingOrder, member: e.target.value })} className="w-full bg-[#fcfaf6] border border-[#ded5c2] rounded-xl px-3 py-2 text-xs" />
                    </div>
                  </div>
                </>
              )}
              {editingOrder.activityType === 'go' && (
                <div>
                  <label className="text-xs font-bold text-[#5c5549]">Member Name</label>
                  <input type="text" required value={editingOrder.personName || ''} onChange={(e) => setEditingOrder({ ...editingOrder, personName: e.target.value })} className="w-full bg-[#fcfaf6] border border-[#ded5c2] rounded-xl px-3 py-2 text-sm font-bold" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-[#5c5549]">Buyer</label>
                  <input type="text" value={editingOrder.buyer || ''} onChange={(e) => setEditingOrder({ ...editingOrder, buyer: e.target.value })} className="w-full bg-[#fcfaf6] border border-[#ded5c2] rounded-xl px-3 py-2 text-xs" />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#5c5549]">Seller</label>
                  <input type="text" value={editingOrder.seller || ''} onChange={(e) => setEditingOrder({ ...editingOrder, seller: e.target.value })} className="w-full bg-[#fcfaf6] border border-[#ded5c2] rounded-xl px-3 py-2 text-xs" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-[#5c5549]">Status</label>
                  <select value={editingOrder.status || 'unpaid'} onChange={(e) => setEditingOrder({ ...editingOrder, status: e.target.value })} className="w-full bg-[#fcfaf6] border border-[#ded5c2] rounded-xl px-3 py-2 text-xs font-bold">
                    {getStatusOptions(editingOrder.activityType || 'go').map(opt => <option key={opt.val} value={opt.val}>{opt.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-[#5c5549]">Amount (SGD)</label>
                  <input type="number" step="any" value={editingOrder.billedAmountSgd || ''} onChange={(e) => setEditingOrder({ ...editingOrder, billedAmountSgd: e.target.value })} className="w-full bg-[#fcfaf6] border border-[#ded5c2] rounded-xl px-3 py-2 text-xs" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-[#5c5549]">Order Date</label>
                  <input type="date" value={editingOrder.orderDate || ''} onChange={(e) => setEditingOrder({ ...editingOrder, orderDate: e.target.value })} className="w-full bg-[#fcfaf6] border border-[#ded5c2] rounded-xl px-3 py-2 text-xs" />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#5c5549]">Payment Date</label>
                  <input type="date" value={editingOrder.paymentDate || ''} onChange={(e) => setEditingOrder({ ...editingOrder, paymentDate: e.target.value })} className="w-full bg-[#fcfaf6] border border-[#ded5c2] rounded-xl px-3 py-2 text-xs" />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setEditingOrder(null)} className="px-4 py-2 bg-gray-100 rounded-xl text-xs font-bold">Cancel</button>
                <button type="submit" className="flex-1 py-2 bg-[#c05c3b] text-white rounded-xl text-xs font-bold">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Purchase Modal */}
      {showAddPurchaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#23201c]/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-[#ded5c2] rounded-3xl p-5 w-full max-w-md shadow-2xl space-y-4">
            <h3 className="text-lg font-black text-[#23201c]">Add Purchase</h3>
            <form onSubmit={handleCreatePurchase} className="space-y-3">
              <div className="max-h-[50vh] overflow-y-auto space-y-4 pr-1">
                {newPurchaseRows.map((row, idx) => (
                  <div key={idx} className="p-4 bg-[#fcfaf6] rounded-xl border border-[#ded5c2] space-y-3 relative">
                    {newPurchaseRows.length > 1 && (
                      <button type="button" onClick={() => setNewPurchaseRows(newPurchaseRows.filter((_, i) => i !== idx))} className="absolute top-3 right-3 text-red-400 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    <div>
                      <label className="text-xs font-bold">Item Description</label>
                      <input type="text" required value={row.title} onChange={(e) => { const newRows = [...newPurchaseRows]; newRows[idx].title = e.target.value; setNewPurchaseRows(newRows); }} className="w-full border rounded-xl px-3 py-2 text-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-bold">Era</label>
                        <input type="text" value={row.era} onChange={(e) => { const newRows = [...newPurchaseRows]; newRows[idx].era = e.target.value; setNewPurchaseRows(newRows); }} className="w-full border rounded-xl px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="text-xs font-bold">Member (Idol)</label>
                        <input type="text" value={row.member} onChange={(e) => { const newRows = [...newPurchaseRows]; newRows[idx].member = e.target.value; setNewPurchaseRows(newRows); }} className="w-full border rounded-xl px-3 py-2 text-sm" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-bold">Seller</label>
                        <input type="text" required value={row.seller} onChange={(e) => { const newRows = [...newPurchaseRows]; newRows[idx].seller = e.target.value; setNewPurchaseRows(newRows); }} className="w-full border rounded-xl px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="text-xs font-bold">Amount (SGD)</label>
                        <input type="number" step="any" required value={row.amountSgd} onChange={(e) => { const newRows = [...newPurchaseRows]; newRows[idx].amountSgd = e.target.value; setNewPurchaseRows(newRows); }} className="w-full border rounded-xl px-3 py-2 text-sm" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => setNewPurchaseRows([...newPurchaseRows, { title: '', seller: '', amountSgd: '', era: '', member: '' }])} className="w-full py-2 bg-[#f8f5ed] hover:bg-[#eae3d2] rounded-xl text-xs font-bold border border-[#ded5c2] text-[#475569]">
                + Add Another Row
              </button>
              <div>
                <label className="text-xs font-bold">Link to Event (Optional)</label>
                <select value={newPurchaseEventId} onChange={(e) => setNewPurchaseEventId(e.target.value)} className="w-full border rounded-xl px-3 py-2 text-sm">
                  <option value="standalone_activities">None (Standalone)</option>
                  {events.map((evt) => <option key={evt.id} value={evt.id}>{evt.name}</option>)}
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowAddPurchaseModal(false)} className="px-4 py-2 bg-gray-100 rounded-xl text-xs font-bold">Cancel</button>
                <button type="submit" className="flex-1 py-2 bg-[#475569] text-white rounded-xl text-xs font-bold">Save {newPurchaseRows.length} Purchase(s)</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Sale Modal */}
      {showAddSaleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#23201c]/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-[#ded5c2] rounded-3xl p-5 w-full max-w-md shadow-2xl space-y-4">
            <h3 className="text-lg font-black text-[#23201c]">Add Stock Sale</h3>
            <form onSubmit={handleCreateSale} className="space-y-3">
              <div className="max-h-[50vh] overflow-y-auto space-y-4 pr-1">
                {newSaleRows.map((row, idx) => (
                  <div key={idx} className="p-4 bg-[#fcfaf6] rounded-xl border border-[#ded5c2] space-y-3 relative">
                    {newSaleRows.length > 1 && (
                      <button type="button" onClick={() => setNewSaleRows(newSaleRows.filter((_, i) => i !== idx))} className="absolute top-3 right-3 text-red-400 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    <div>
                      <label className="text-xs font-bold">Item Description</label>
                      <input type="text" required value={row.title} onChange={(e) => { const newRows = [...newSaleRows]; newRows[idx].title = e.target.value; setNewSaleRows(newRows); }} className="w-full border rounded-xl px-3 py-2 text-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-bold">Era</label>
                        <input type="text" value={row.era} onChange={(e) => { const newRows = [...newSaleRows]; newRows[idx].era = e.target.value; setNewSaleRows(newRows); }} className="w-full border rounded-xl px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="text-xs font-bold">Member (Idol)</label>
                        <input type="text" value={row.member} onChange={(e) => { const newRows = [...newSaleRows]; newRows[idx].member = e.target.value; setNewSaleRows(newRows); }} className="w-full border rounded-xl px-3 py-2 text-sm" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-bold">Buyer</label>
                        <input type="text" required value={row.buyer} onChange={(e) => { const newRows = [...newSaleRows]; newRows[idx].buyer = e.target.value; setNewSaleRows(newRows); }} className="w-full border rounded-xl px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="text-xs font-bold">Amount Charged (SGD)</label>
                        <input type="number" step="any" required value={row.amountSgd} onChange={(e) => { const newRows = [...newSaleRows]; newRows[idx].amountSgd = e.target.value; setNewSaleRows(newRows); }} className="w-full border rounded-xl px-3 py-2 text-sm" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => setNewSaleRows([...newSaleRows, { title: '', buyer: '', amountSgd: '', era: '', member: '' }])} className="w-full py-2 bg-[#f8f5ed] hover:bg-[#eae3d2] rounded-xl text-xs font-bold border border-[#ded5c2] text-[#059669]">
                + Add Another Row
              </button>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowAddSaleModal(false)} className="px-4 py-2 bg-gray-100 rounded-xl text-xs font-bold">Cancel</button>
                <button type="submit" className="flex-1 py-2 bg-[#059669] text-white rounded-xl text-xs font-bold">Save {newSaleRows.length} Sale(s)</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bill Modal */}
      {billingOrder && (
        <BillModal
          order={billingOrder}
          events={events}
          onClose={() => setBillingOrder(null)}
          onSaveAmount={(amount) => {
            const evtId = billingOrder.eventId;
            const updated = (ordersMap[evtId] || []).map((ord) =>
              ord.id === billingOrder.id ? { ...ord, billedAmountSgd: amount } : ord
            );
            onUpdateOrdersForEvent(evtId, updated);
            setBillingOrder((prev) => (prev ? { ...prev, billedAmountSgd: amount } : null));
          }}
        />
      )}
    </div>
  );
}
