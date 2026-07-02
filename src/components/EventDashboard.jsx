import React, { useState } from 'react';
import { Calendar, Plus, Edit2, Trash2, Check, Globe, Sparkles, RefreshCw, ArrowRight } from 'lucide-react';
import { fetchLiveExchangeRate, formatCurrency } from '../utils/calculations';

const SUPPORTED_CURRENCIES = [
  { code: 'KRW', name: 'South Korean Won' },
  { code: 'TWD', name: 'New Taiwan Dollar' },
  { code: 'JPY', name: 'Japanese Yen' },
  { code: 'USD', name: 'US Dollar' },
  { code: 'HKD', name: 'Hong Kong Dollar' },
  { code: 'CNY', name: 'Chinese Yuan' },
  { code: 'SGD', name: 'Singapore Dollar' },
  { code: 'PHP', name: 'Philippine Peso' },
  { code: 'IDR', name: 'Indonesian Rupiah' },
  { code: 'THB', name: 'Thai Baht' },
];

export default function EventDashboard({
  events,
  activeEventId,
  onSelectEvent,
  onCreateEvent,
  onUpdateEvent,
  onDeleteEvent,
}) {
  const activeEvent = events.find((e) => e.id === activeEventId) || events[0];
  const [isEditing, setIsEditing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isFetchingRate, setIsFetchingRate] = useState(false);
  const [rateStatus, setRateStatus] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    currencyCode: 'KRW',
    exchangeRate: 0.00098,
    benefitThreshold: 50000,
  });

  const handleStartCreate = () => {
    setFormData({
      name: '',
      currencyCode: 'KRW',
      exchangeRate: 0.00098,
      benefitThreshold: 50000,
    });
    setRateStatus('');
    setShowCreateModal(true);
  };

  const handleStartEdit = (evt) => {
    setFormData({
      name: evt.name,
      currencyCode: evt.currencyCode || 'KRW',
      exchangeRate: evt.exchangeRate,
      benefitThreshold: evt.benefitThreshold || 50000,
    });
    setRateStatus('');
    setIsEditing(true);
  };

  const handleCurrencySelect = async (code) => {
    const curr = SUPPORTED_CURRENCIES.find((c) => c.code === code) || { code };
    setFormData((prev) => ({ ...prev, currencyCode: curr.code }));

    setIsFetchingRate(true);
    setRateStatus('Fetching live exchange rate...');
    try {
      const liveRate = await fetchLiveExchangeRate(curr.code);
      setFormData((prev) => ({
        ...prev,
        currencyCode: curr.code,
        exchangeRate: liveRate,
      }));
      setRateStatus(`Live rate applied: 1 ${curr.code} = ${liveRate} SGD`);
    } catch (err) {
      setRateStatus('Could not auto-fetch rate. Please input manually.');
    } finally {
      setIsFetchingRate(false);
    }
  };

  const handlePullLiveRate = async () => {
    if (!formData.currencyCode) return;
    setIsFetchingRate(true);
    setRateStatus('Fetching...');
    try {
      const liveRate = await fetchLiveExchangeRate(formData.currencyCode);
      setFormData((prev) => ({ ...prev, exchangeRate: liveRate }));
      setRateStatus('Live rate applied!');
    } catch (err) {
      setRateStatus('Could not pull API rate.');
    } finally {
      setIsFetchingRate(false);
    }
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!activeEvent) return;
    onUpdateEvent(activeEvent.id, {
      ...activeEvent,
      name: formData.name,
      currencyCode: formData.currencyCode,
      exchangeRate: Number(formData.exchangeRate),
      benefitThreshold: Number(formData.benefitThreshold),
    });
    setIsEditing(false);
  };

  const handleSaveNew = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    const newEvt = {
      id: `evt-${Date.now()}`,
      name: formData.name.trim(),
      currencyCode: formData.currencyCode || 'LOCAL',
      exchangeRate: Number(formData.exchangeRate || 1),
      benefitThreshold: Number(formData.benefitThreshold || 50000),
      catalog: [],
    };
    onCreateEvent(newEvt);
    setShowCreateModal(false);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-5 pb-24">
      {/* Title & Action */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black font-heading text-[#23201c]">Event Workspace</h2>
          <p className="text-xs text-[#716a5d]">Manage currencies, live SGD rates & local benefit thresholds</p>
        </div>
        <button
          onClick={handleStartCreate}
          className="flex items-center gap-1.5 bg-gradient-to-r from-[#c05c3b] to-[#b45309] hover:from-[#ab4e31] hover:to-[#994607] text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-md shadow-[#c05c3b]/20 transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>New Event</span>
        </button>
      </div>

      {/* Active Event Configuration Card */}
      {activeEvent && (
        <div className="glass-card rounded-2xl p-4.5 border border-[#e2d6c1] relative overflow-hidden shadow-md">
          <div className="absolute -right-10 -top-10 w-32 h-32 bg-[#c05c3b]/10 rounded-full blur-2xl pointer-events-none" />

          {!isEditing ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="inline-block px-2.5 py-0.5 rounded-md bg-[#f7ebe3] text-[#c05c3b] border border-[#e8cebf] text-[10px] font-extrabold uppercase tracking-wider mb-1.5">
                    Currently Selected
                  </span>
                  <h3 className="text-lg font-extrabold text-[#23201c] font-heading leading-tight">{activeEvent.name}</h3>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleStartEdit(activeEvent)}
                    className="p-2 rounded-xl bg-[#f4ede0] hover:bg-[#ebe1d0] text-[#5c5549] transition shadow-sm"
                    title="Edit event settings"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  {events.length > 1 && (
                    <button
                      onClick={() => {
                        if (confirm(`Delete event "${activeEvent.name}"?`)) {
                          onDeleteEvent(activeEvent.id);
                        }
                      }}
                      className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 transition"
                      title="Delete event"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Grid Specs */}
              <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-[#ede5d6]">
                <div className="bg-[#fcfaf6] p-2.5 rounded-xl border border-[#e6decb] shadow-xs">
                  <span className="text-[10px] text-[#8c8273] uppercase font-bold block">Currency & Rate</span>
                  <div className="text-sm font-bold text-[#23201c] flex items-center gap-1 mt-0.5">
                    <span className="text-[#c05c3b] font-extrabold">{activeEvent.currencyCode}</span>
                    <span>1 {activeEvent.currencyCode} = {activeEvent.exchangeRate} SGD</span>
                  </div>
                </div>

                <div className="bg-[#fcfaf6] p-2.5 rounded-xl border border-[#e6decb] shadow-xs">
                  <span className="text-[10px] text-[#8c8273] uppercase font-bold block">Benefit Threshold</span>
                  <div className="text-sm font-extrabold text-[#b45309] flex items-center gap-1 mt-0.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Every {formatCurrency(activeEvent.benefitThreshold, activeEvent.currencyCode)}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Edit Form */
            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              <div className="flex items-center justify-between border-b border-[#eae3d2] pb-2">
                <span className="text-sm font-extrabold text-[#c05c3b]">Edit Event Parameters</span>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="text-xs font-semibold text-[#716a5d] hover:text-[#23201c]"
                >
                  Cancel
                </button>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#5c5549] block mb-1">Event Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full bg-white border border-[#ded5c2] rounded-xl px-3 py-2 text-sm text-[#23201c] focus:outline-none focus:border-[#c05c3b] shadow-inner"
                />
              </div>

              {/* Single Currency Selector */}
              <div>
                <label className="text-[11px] font-bold text-[#5c5549] block mb-1">Local Currency</label>
                <select
                  value={formData.currencyCode}
                  onChange={(e) => handleCurrencySelect(e.target.value)}
                  className="w-full bg-white border border-[#ded5c2] rounded-xl px-3 py-2 text-sm text-[#23201c] focus:outline-none focus:border-[#c05c3b] shadow-inner font-bold cursor-pointer"
                >
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Live API Rate Puller */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-[#5c5549]">
                    Exchange Rate (1 {formData.currencyCode} = X SGD)
                  </label>
                  <button
                    type="button"
                    onClick={handlePullLiveRate}
                    disabled={isFetchingRate}
                    className="text-[11px] font-extrabold text-[#c05c3b] hover:underline flex items-center gap-1 bg-[#f7ebe3] px-2 py-0.5 rounded-lg border border-[#e8cebf]"
                  >
                    <RefreshCw className={`w-3 h-3 ${isFetchingRate ? 'animate-spin' : ''}`} />
                    <span>Pull Live API Rate</span>
                  </button>
                </div>
                <input
                  type="number"
                  step="any"
                  value={formData.exchangeRate}
                  onChange={(e) => setFormData({ ...formData, exchangeRate: e.target.value })}
                  required
                  className="w-full bg-white border border-[#ded5c2] rounded-xl px-3 py-2 text-sm text-[#23201c] font-mono focus:outline-none focus:border-[#c05c3b] shadow-inner"
                />
                {rateStatus && (
                  <span className="text-[11px] font-semibold text-[#b45309] block mt-1">{rateStatus}</span>
                )}
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#5c5549] block mb-1">
                  Benefit Threshold (in Local {formData.currencyCode})
                </label>
                <input
                  type="number"
                  step="any"
                  value={formData.benefitThreshold}
                  onChange={(e) => setFormData({ ...formData, benefitThreshold: e.target.value })}
                  required
                  placeholder="e.g. 50000"
                  className="w-full bg-white border border-[#ded5c2] rounded-xl px-3 py-2 text-sm text-[#23201c] font-mono focus:outline-none focus:border-[#c05c3b] shadow-inner"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#c05c3b] hover:bg-[#ab4e31] text-white font-bold text-sm shadow-md shadow-[#c05c3b]/20 transition active:scale-95 flex items-center justify-center gap-2 mt-2"
              >
                <Check className="w-4 h-4" />
                <span>Save Changes</span>
              </button>
            </form>
          )}
        </div>
      )}

      {/* Switch Event List */}
      <div className="space-y-2.5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#8c8273] px-1">All Events</h3>
        {events.map((evt) => {
          const isSelected = evt.id === activeEventId;
          return (
            <div
              key={evt.id}
              onClick={() => onSelectEvent(evt.id)}
              className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between shadow-xs ${isSelected
                ? 'bg-[#fefaf3] border-[#c05c3b]/60 shadow-md ring-1 ring-[#c05c3b]/20'
                : 'bg-white border-[#e6decb] hover:border-[#cfc4af]'
                }`}
            >
              <div className="min-w-0 pr-2">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[#f4eee2] text-[#5c5549] border border-[#e3d8c4]">
                    {evt.currencyCode}
                  </span>
                  <h4 className={`text-sm font-extrabold truncate ${isSelected ? 'text-[#c05c3b]' : 'text-[#23201c]'}`}>
                    {evt.name}
                  </h4>
                </div>
                <p className="text-[11px] text-[#716a5d] truncate">
                  1 {evt.currencyCode || 'Local'} = {evt.exchangeRate} SGD • Threshold: {formatCurrency(evt.benefitThreshold, evt.currencyCode)}
                </p>
              </div>
              <div className="shrink-0">
                {isSelected ? (
                  <div className="w-6 h-6 rounded-full bg-[#c05c3b] flex items-center justify-center text-white shadow-sm shadow-[#c05c3b]/40">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                ) : (
                  <ArrowRight className="w-4 h-4 text-[#a89f91]" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create New Event Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#23201c]/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white border border-[#ded5c2] rounded-3xl p-5 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#f7ebe3] text-[#c05c3b]">
                  <Calendar className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-black text-[#23201c] font-heading">Create New Event</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-[#8c8273] hover:text-[#23201c] text-sm font-semibold"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleSaveNew} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-[#5c5549] block mb-1">Event Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SEVENTEEN WORLD TOUR SEOUL MERCH"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-[#fcfaf6] border border-[#ded5c2] rounded-xl px-3.5 py-2.5 text-sm text-[#23201c] focus:outline-none focus:border-[#c05c3b] shadow-inner"
                />
              </div>

              {/* Single Currency Selector */}
              <div>
                <label className="text-xs font-bold text-[#5c5549] block mb-1">Select Local Currency</label>
                <select
                  value={formData.currencyCode}
                  onChange={(e) => handleCurrencySelect(e.target.value)}
                  className="w-full bg-[#fcfaf6] border border-[#ded5c2] rounded-xl px-3.5 py-2.5 text-sm text-[#23201c] focus:outline-none focus:border-[#c05c3b] shadow-inner font-bold cursor-pointer"
                >
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Live Rate Fetcher inside Create Modal */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-[#5c5549]">
                    Exchange Rate (1 {formData.currencyCode} = X SGD)
                  </label>
                  <button
                    type="button"
                    onClick={handlePullLiveRate}
                    disabled={isFetchingRate}
                    className="text-[11px] font-extrabold text-[#c05c3b] hover:underline flex items-center gap-1 bg-[#f7ebe3] px-2 py-0.5 rounded-lg border border-[#e8cebf]"
                  >
                    <RefreshCw className={`w-3 h-3 ${isFetchingRate ? 'animate-spin' : ''}`} />
                    <span>Pull Live API Rate</span>
                  </button>
                </div>
                <input
                  type="number"
                  step="any"
                  required
                  value={formData.exchangeRate}
                  onChange={(e) => setFormData({ ...formData, exchangeRate: e.target.value })}
                  className="w-full bg-[#fcfaf6] border border-[#ded5c2] rounded-xl px-3.5 py-2.5 text-sm text-[#23201c] font-mono focus:outline-none focus:border-[#c05c3b] shadow-inner"
                />
                {rateStatus && (
                  <span className="text-[11px] font-semibold text-[#b45309] block mt-1">{rateStatus}</span>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-[#5c5549] block mb-1">
                  Benefit Threshold (in Local {formData.currencyCode})
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="e.g. 50000"
                  value={formData.benefitThreshold}
                  onChange={(e) => setFormData({ ...formData, benefitThreshold: e.target.value })}
                  className="w-full bg-[#fcfaf6] border border-[#ded5c2] rounded-xl px-3.5 py-2.5 text-sm text-[#23201c] font-mono focus:outline-none focus:border-[#c05c3b] shadow-inner"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#c05c3b] to-[#b45309] hover:from-[#ab4e31] hover:to-[#994607] text-white font-bold text-sm shadow-md shadow-[#c05c3b]/20 transition active:scale-95 mt-3"
              >
                Create Event & Switch
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
