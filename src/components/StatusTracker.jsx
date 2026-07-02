import React, { useState, useMemo } from 'react';
import {
  Users,
  CreditCard,
  Package,
  CheckCircle,
  Clock,
  Calendar,
  Sparkles,
  ShoppingBag,
  Filter,
  ArrowRight,
  Truck,
  Globe,
  AlertCircle,
  DollarSign,
  Edit3,
  MessageSquare
} from 'lucide-react';
import { calculateEventSummary, formatCurrency } from '../utils/calculations';

export default function StatusTracker({ events = [], ordersMap = {}, activeEventId, onUpdateOrdersForEvent }) {
  const [selectedEventFilter, setSelectedEventFilter] = useState('ALL'); // 'ALL' | eventId
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'unpaid' | 'paid' | 'completed'
  const [buyerFilter, setBuyerFilter] = useState('ALL'); // 'ALL' | buyerName
  const [editingOrder, setEditingOrder] = useState(null);

  // Build a global list of processed orders enriched with Event metadata
  const allProcessedOrders = useMemo(() => {
    const list = [];
    events.forEach((evt) => {
      const rawOrders = ordersMap[evt.id] || [];
      const summary = calculateEventSummary(evt, rawOrders);
      (summary.processedOrders || []).forEach((ord) => {
        list.push({
          ...ord,
          eventId: evt.id,
          eventName: evt.name,
          currencyCode: evt.currencyCode || 'USD',
        });
      });
    });
    return list;
  }, [events, ordersMap]);

  // Filter by event
  const eventFilteredOrders = useMemo(() => {
    if (selectedEventFilter === 'ALL') return allProcessedOrders;
    return allProcessedOrders.filter((o) => o.eventId === selectedEventFilter);
  }, [allProcessedOrders, selectedEventFilter]);

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

  // Filter by status & buyer
  const finalDisplayedOrders = useMemo(() => {
    return eventFilteredOrders.filter((o) => {
      const matchesStatus = statusFilter === 'all' || (o.status || 'unpaid') === statusFilter;
      const b = (o.buyer || o.personName || 'Me').trim();
      const matchesBuyer = buyerFilter === 'ALL' || b.toLowerCase() === buyerFilter.toLowerCase();
      return matchesStatus && matchesBuyer;
    });
  }, [eventFilteredOrders, statusFilter, buyerFilter]);

  // Calculate financial oversight & aging receivables
  const receivablesOverview = useMemo(() => {
    let owedToMeSgd = 0;
    let owedCount = 0;
    let myLiabilitiesSgd = 0;
    let upcomingCollections = 0;

    const today = new Date().toISOString().split('T')[0];

    eventFilteredOrders.forEach((ord) => {
      const isUnpaid = (ord.status || 'unpaid') !== 'paid' && (ord.status || 'unpaid') !== 'completed';
      if (isUnpaid) {
        if (ord.orderType === 'taking') {
          owedToMeSgd += Number(ord.orderSgdSpend || 0);
          owedCount += 1;
        } else if (ord.orderType === 'placing') {
          myLiabilitiesSgd += Number(ord.orderSgdSpend || 0);
        }
      }
      if (ord.collectionDate && ord.collectionDate >= today) {
        upcomingCollections += 1;
      }
    });

    return {
      owedToMeSgd: owedToMeSgd.toFixed(2),
      owedCount,
      myLiabilitiesSgd: myLiabilitiesSgd.toFixed(2),
      upcomingCollections,
    };
  }, [eventFilteredOrders]);

  const handleStatusChange = (orderId, eventId, nextStatus) => {
    const currentOrders = ordersMap[eventId] || [];
    const updated = currentOrders.map((ord) => {
      if (ord.id === orderId) {
        const payDate =
          (nextStatus === 'paid' || nextStatus === 'completed') && !ord.paymentDate
            ? new Date().toISOString().split('T')[0]
            : ord.paymentDate;
        return { ...ord, status: nextStatus, paymentDate: payDate };
      }
      return ord;
    });
    onUpdateOrdersForEvent(eventId, updated);
  };

  const handleCommentChange = (orderId, eventId, newComment) => {
    const currentOrders = ordersMap[eventId] || [];
    const updated = currentOrders.map((ord) => {
      if (ord.id === orderId) {
        return { ...ord, comment: newComment };
      }
      return ord;
    });
    onUpdateOrdersForEvent(eventId, updated);
  };

  const handleSaveModalEdit = (e) => {
    e.preventDefault();
    if (!editingOrder) return;
    const { eventId, id } = editingOrder;
    const currentOrders = ordersMap[eventId] || [];
    const updated = currentOrders.map((ord) => {
      if (ord.id === id) {
        const isHost = editingOrder.orderType === 'host';
        const role = editingOrder.orderType;
        const nameInput = editingOrder.personName.trim() || 'Me';

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
          status: editingOrder.status,
          orderDate: editingOrder.orderDate,
          paymentDate: editingOrder.paymentDate,
          collectionDate: editingOrder.collectionDate,
          comment: editingOrder.comment || '',
        };
      }
      if (editingOrder.orderType === 'host' && ord.id !== id) {
        return { ...ord, isMyOrder: false, orderType: ord.orderType === 'host' ? 'taking' : ord.orderType };
      }
      return ord;
    });
    onUpdateOrdersForEvent(eventId, updated);
    setEditingOrder(null);
  };

  const getDaysAgo = (dateStr) => {
    if (!dateStr) return null;
    const past = new Date(dateStr);
    const now = new Date();
    const diffTime = now - past;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    if (isNaN(diffDays)) return null;
    return diffDays;
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

  const getStatusBadge = (status) => {
    switch (status) {
      case 'paid':
        return { label: 'Paid', color: 'bg-blue-500/15 text-blue-700 border-blue-400', icon: CreditCard };
      case 'completed':
        return { label: 'Completed', color: 'bg-emerald-500/15 text-emerald-700 border-emerald-400', icon: CheckCircle };
      default:
        return { label: 'Unpaid', color: 'bg-amber-500/15 text-amber-800 border-amber-400', icon: Clock };
    }
  };

  const getRoleBadge = (ord) => {
    if (ord.isMyOrder || ord.orderType === 'host') {
      return { label: '👑 Host Anchor', color: 'bg-[#c05c3b] text-white' };
    }
    if (ord.orderType === 'placing') {
      return { label: '📤 Proxy Placement', color: 'bg-[#475569] text-white' };
    }
    return { label: '📥 Member Order', color: 'bg-[#334155] text-slate-100' };
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 space-y-4 pb-28">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-black font-heading text-[#23201c]">Fulfillment & Receivables Table</h2>
          <p className="text-xs text-[#716a5d]">
            Tabular oversight of member statuses, outstanding balances & editable notes across all events
          </p>
        </div>
      </div>

      {/* Financial Receivables & Logistics KPI Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        <div className="glass-card rounded-2xl p-3 border border-[#e2d6c1] shadow-xs bg-gradient-to-br from-[#fefaf3] to-[#fff]">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#b45309] flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5 text-[#d97706]" />
            <span>Owed to Me (Receivables)</span>
          </span>
          <div className="text-lg font-black text-[#23201c] font-mono mt-0.5">
            ${receivablesOverview.owedToMeSgd} SGD
          </div>
          <span className="text-[10px] font-semibold text-[#716a5d]">
            Across {receivablesOverview.owedCount} unpaid member {receivablesOverview.owedCount === 1 ? 'sheet' : 'sheets'}
          </span>
        </div>

        <div className="glass-card rounded-2xl p-3 border border-[#ded5c2] shadow-xs bg-[#fdfbf7]">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#475569] flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-[#64748b]" />
            <span>My Liabilities (To Proxies)</span>
          </span>
          <div className="text-lg font-black text-[#334155] font-mono mt-0.5">
            ${receivablesOverview.myLiabilitiesSgd} SGD
          </div>
          <span className="text-[10px] font-semibold text-[#716a5d]">
            Pending payments to runners
          </span>
        </div>

        <div className="col-span-2 sm:col-span-1 glass-card rounded-2xl p-3 border border-[#ded5c2] shadow-xs bg-[#fdfbf7]">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#059669] flex items-center gap-1">
            <Truck className="w-3.5 h-3.5 text-[#10b981]" />
            <span>Upcoming Handovers</span>
          </span>
          <div className="text-lg font-black text-[#065f46] font-mono mt-0.5">
            {receivablesOverview.upcomingCollections} scheduled
          </div>
          <span className="text-[10px] font-semibold text-[#716a5d]">
            Planned collection dates tracked
          </span>
        </div>
      </div>

      {/* Consolidated Dropdown Filters Bar */}
      <div className="flex items-center gap-2 bg-white/90 border border-[#ded5c2] rounded-2xl p-2 shadow-2xs overflow-x-auto no-scrollbar whitespace-nowrap">
        {/* Event Dropdown */}
        <div className="h-8 px-2.5 flex items-center gap-1.5 bg-[#f8f5ed] border border-[#e2d6c1] rounded-xl shrink-0">
          <Globe className="w-3.5 h-3.5 text-[#c05c3b] shrink-0" />
          <span className="text-[10px] font-black uppercase text-[#716a5d] shrink-0">Event:</span>
          <select
            value={selectedEventFilter}
            onChange={(e) => setSelectedEventFilter(e.target.value)}
            className="bg-transparent text-xs font-extrabold text-[#23201c] focus:outline-none cursor-pointer pr-1"
          >
            <option value="ALL">All Events ({allProcessedOrders.length})</option>
            {events.map((evt) => {
              const count = (ordersMap[evt.id] || []).length;
              return (
                <option key={evt.id} value={evt.id}>
                  {evt.name} ({count})
                </option>
              );
            })}
          </select>
        </div>

        {/* Status Dropdown */}
        <div className="h-8 px-2.5 flex items-center gap-1.5 bg-[#f8f5ed] border border-[#e2d6c1] rounded-xl shrink-0">
          <Filter className="w-3.5 h-3.5 text-[#b45309] shrink-0" />
          <span className="text-[10px] font-black uppercase text-[#716a5d] shrink-0">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-transparent text-xs font-extrabold text-[#23201c] focus:outline-none cursor-pointer pr-1"
          >
            <option value="all">All Statuses ({eventFilteredOrders.length})</option>
            <option value="unpaid">⏳ Unpaid ({eventFilteredOrders.filter((o) => (o.status || 'unpaid') === 'unpaid').length})</option>
            <option value="paid">💳 Paid ({eventFilteredOrders.filter((o) => o.status === 'paid').length})</option>
            <option value="completed">✅ Completed ({eventFilteredOrders.filter((o) => o.status === 'completed').length})</option>
          </select>
        </div>

        {/* Buyer Dropdown */}
        {uniqueBuyers.length > 0 && (
          <div className="h-8 px-2.5 flex items-center gap-1.5 bg-[#f8f5ed] border border-[#e2d6c1] rounded-xl shrink-0">
            <Users className="w-3.5 h-3.5 text-[#059669] shrink-0" />
            <span className="text-[10px] font-black uppercase text-[#716a5d] shrink-0">Buyer:</span>
            <select
              value={buyerFilter}
              onChange={(e) => setBuyerFilter(e.target.value)}
              className="bg-transparent text-xs font-extrabold text-[#23201c] focus:outline-none cursor-pointer pr-1"
            >
              <option value="ALL">All Buyers ({eventFilteredOrders.length})</option>
              {uniqueBuyers.map((bName) => {
                const count = eventFilteredOrders.filter((o) => (o.buyer || o.personName || 'Me').trim().toLowerCase() === bName.toLowerCase()).length;
                return (
                  <option key={bName} value={bName}>
                    {bName} ({count})
                  </option>
                );
              })}
            </select>
          </div>
        )}

        {(selectedEventFilter !== 'ALL' || statusFilter !== 'all' || buyerFilter !== 'ALL') && (
          <button
            onClick={() => {
              setSelectedEventFilter('ALL');
              setStatusFilter('all');
              setBuyerFilter('ALL');
            }}
            className="h-8 px-2.5 flex items-center text-[11px] font-bold text-[#c05c3b] hover:underline ml-auto shrink-0"
          >
            Reset All
          </button>
        )}
      </div>

      {/* Tabular Spreadsheet View */}
      {finalDisplayedOrders.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center border border-[#ded5c2] space-y-2">
          <Filter className="w-8 h-8 text-[#b4a997] mx-auto stroke-1" />
          <p className="text-sm font-bold text-[#23201c]">No sheets matching current filters</p>
          <button onClick={() => { setSelectedEventFilter('ALL'); setStatusFilter('all'); setBuyerFilter('ALL'); }} className="text-xs font-semibold text-[#c05c3b] hover:underline">
            Reset filters
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#ded5c2] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[750px]">
              <thead>
                <tr className="bg-[#fcfaf6] border-b border-[#ded5c2] text-[10px] font-black uppercase tracking-wider text-[#716a5d]">
                  <th className="py-3 px-3">Member & Event</th>
                  <th className="py-3 px-2.5">Buyer ➔ Seller</th>
                  <th className="py-3 px-2.5">Pipeline Status</th>
                  <th className="py-3 px-2.5">Dates & Collection</th>
                  <th className="py-3 px-3">Free Text Comment</th>
                  <th className="py-3 px-3 text-right">Spend & Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eae3d2] text-xs">
                {finalDisplayedOrders.map((ord) => {
                  const roleBadge = getRoleBadge(ord);
                  const statusBadge = getStatusBadge(ord.status);
                  const StatusIcon = statusBadge.icon;
                  const isUnpaid = (ord.status || 'unpaid') !== 'paid' && (ord.status || 'unpaid') !== 'completed';
                  const daysAgo = getDaysAgo(ord.orderDate);

                  const itemKeys = Object.keys(ord.items || {});

                  return (
                    <tr key={`${ord.eventId}-${ord.id}`} className="hover:bg-[#fefaf3]/60 transition group">
                      {/* Member & Event */}
                      <td className="py-3 px-3 align-top">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className={`text-[9px] font-black px-1.5 py-0.2 rounded ${roleBadge.color}`}>
                            {roleBadge.label}
                          </span>
                        </div>
                        <div className="text-sm truncate max-w-[130px]">
                          {renderNameWithMeHighlight(ord.personName, 'Me')}
                        </div>
                        <div className="text-[10px] text-[#716a5d] font-semibold truncate max-w-[130px] mt-0.5">
                          {ord.eventName}
                        </div>
                        {itemKeys.length > 0 && (
                          <div className="text-[10px] text-[#a89f91] mt-1 truncate max-w-[130px]">
                            🛒 {ord.totalItemsCount} {ord.totalItemsCount === 1 ? 'item' : 'items'}
                          </div>
                        )}
                      </td>

                      {/* Transaction Relationship */}
                      <td className="py-3 px-2.5 align-top font-mono text-[11px]">
                        <div className="bg-[#f8f5ed] border border-[#ded5c2] rounded-lg p-1.5 space-y-0.5 max-w-[150px]">
                          <div className="truncate">
                            <strong className="text-[#5c5549]">B:</strong> {renderNameWithMeHighlight(ord.buyer, ord.personName)}
                          </div>
                          <div className="truncate">
                            <strong className="text-[#5c5549]">S:</strong> {renderNameWithMeHighlight(ord.seller, 'Me')}
                          </div>
                        </div>
                      </td>

                      {/* Pipeline Status Selector */}
                      <td className="py-3 px-2.5 align-top">
                        <div className="relative inline-block">
                          <select
                            value={ord.status || 'unpaid'}
                            onChange={(e) => handleStatusChange(ord.id, ord.eventId, e.target.value)}
                            aria-label="Update pipeline status"
                            className={`appearance-none cursor-pointer pl-5 pr-5 py-1 rounded-lg text-[11px] font-black border transition focus:outline-none shadow-2xs ${statusBadge.color}`}
                          >
                            <option value="unpaid">⏳ Unpaid</option>
                            <option value="paid">💳 Paid</option>
                            <option value="completed">✅ Completed</option>
                          </select>
                          <StatusIcon className="w-3 h-3 absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </td>

                      {/* Dates & Collection Plan */}
                      <td className="py-3 px-2.5 align-top font-mono text-[10px] space-y-1">
                        <div className="flex items-center gap-1 text-[#5c5549]">
                          <Calendar className="w-2.5 h-2.5 text-[#c05c3b]" />
                          <span>Ord: {ord.orderDate || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[#5c5549]">
                          <CreditCard className="w-2.5 h-2.5 text-[#059669]" />
                          <span>Pay: {ord.paymentDate || 'Pending'}</span>
                        </div>
                        {ord.collectionDate ? (
                          <div className="flex items-center gap-1 font-bold text-[#b45309] bg-[#fef3c7] px-1 py-0.5 rounded border border-[#fde68a] inline-block">
                            <Truck className="w-2.5 h-2.5" />
                            <span>Collect: {ord.collectionDate}</span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-[#a89f91] italic block">No collect date</span>
                        )}
                      </td>

                      {/* Free Text Comment Input */}
                      <td className="py-3 px-3 align-top">
                        <input
                          type="text"
                          placeholder="Add comment..."
                          value={ord.comment || ''}
                          onChange={(e) => handleCommentChange(ord.id, ord.eventId, e.target.value)}
                          className="w-full min-w-[140px] max-w-[180px] bg-[#fdfbf7] hover:bg-[#fff] focus:bg-[#fff] border border-[#e6decb] focus:border-[#c05c3b] rounded-lg px-2.5 py-1.5 text-xs text-[#23201c] focus:outline-none transition shadow-inner"
                        />
                      </td>

                      {/* Spend & Edit Action */}
                      <td className="py-3 px-3 align-top text-right font-mono">
                        <div className="text-sm font-black text-[#c05c3b]">
                          ${ord.orderSgdSpend} SGD
                        </div>
                        <div className="text-[10px] text-[#716a5d]">
                          {formatCurrency(ord.orderLocalSpend, ord.currencyCode)}
                        </div>

                        {/* Receivables Alert Badge */}
                        {isUnpaid && ord.orderType === 'taking' && (
                          <div className="mt-1.5 inline-flex items-center gap-1 bg-[#fef2f2] text-red-700 border border-red-300 px-1 py-0.2 rounded text-[9px] font-extrabold font-sans">
                            <AlertCircle className="w-2.5 h-2.5 shrink-0" />
                            <span>Owed {daysAgo !== null ? `${daysAgo}d` : 'unpaid'}</span>
                          </div>
                        )}

                        <div className="mt-2">
                          <button
                            onClick={() => setEditingOrder({ ...ord })}
                            className="inline-flex items-center gap-1 bg-[#f4eee2] hover:bg-[#ede5d6] text-[#3d3730] border border-[#ded5c2] px-2 py-1 rounded-lg text-[10px] font-bold font-sans transition active:scale-95"
                          >
                            <Edit3 className="w-3 h-3 text-[#c05c3b]" />
                            <span>Edit Row</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Full Order Edit Modal inside Status Table */}
      {editingOrder && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#23201c]/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white border border-[#ded5c2] rounded-3xl p-5 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#eae3d2] pb-2.5">
              <div>
                <span className="text-[10px] font-extrabold text-[#c05c3b] uppercase tracking-wider block">Edit Order Sheet</span>
                <h3 className="text-lg font-black text-[#23201c] font-heading">{editingOrder.eventName}</h3>
              </div>
              <button onClick={() => setEditingOrder(null)} className="text-[#8c8273] hover:text-[#23201c] text-sm font-semibold">
                Close
              </button>
            </div>

            <form onSubmit={handleSaveModalEdit} className="space-y-3.5 text-left">
              <div>
                <label className="text-xs font-bold text-[#5c5549] block mb-1">Order Direction / Role</label>
                <select
                  value={editingOrder.orderType || (editingOrder.isMyOrder ? 'host' : 'taking')}
                  onChange={(e) => setEditingOrder({ ...editingOrder, orderType: e.target.value })}
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
                  value={editingOrder.personName}
                  onChange={(e) => setEditingOrder({ ...editingOrder, personName: e.target.value })}
                  className="w-full bg-[#fcfaf6] border border-[#ded5c2] rounded-xl px-3.5 py-2.5 text-sm text-[#23201c] focus:outline-none focus:border-[#c05c3b] shadow-inner"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-bold text-[#5c5549] block mb-1">Order Status</label>
                  <select
                    value={editingOrder.status || 'unpaid'}
                    onChange={(e) => setEditingOrder({ ...editingOrder, status: e.target.value })}
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
                    value={editingOrder.orderDate || ''}
                    onChange={(e) => setEditingOrder({ ...editingOrder, orderDate: e.target.value })}
                    className="w-full bg-[#fcfaf6] border border-[#ded5c2] rounded-xl px-3 py-2 text-xs text-[#23201c] focus:outline-none focus:border-[#c05c3b] shadow-inner"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-bold text-[#5c5549] block mb-1">Payment Confirmed Date</label>
                  <input
                    type="date"
                    value={editingOrder.paymentDate || ''}
                    onChange={(e) => setEditingOrder({ ...editingOrder, paymentDate: e.target.value })}
                    className="w-full bg-[#fcfaf6] border border-[#ded5c2] rounded-xl px-3 py-2 text-xs text-[#23201c] focus:outline-none focus:border-[#c05c3b] shadow-inner"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#5c5549] block mb-1">Planned Collection / Handover</label>
                  <input
                    type="date"
                    value={editingOrder.collectionDate || ''}
                    onChange={(e) => setEditingOrder({ ...editingOrder, collectionDate: e.target.value })}
                    className="w-full bg-[#fcfaf6] border border-[#ded5c2] rounded-xl px-3 py-2 text-xs text-[#23201c] focus:outline-none focus:border-[#c05c3b] shadow-inner"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#5c5549] block mb-1">Comment / Free Text Note</label>
                <textarea
                  rows="2"
                  placeholder="e.g. Paid via PayNow, meet up at Stadium Gate 3..."
                  value={editingOrder.comment || ''}
                  onChange={(e) => setEditingOrder({ ...editingOrder, comment: e.target.value })}
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
    </div>
  );
}
