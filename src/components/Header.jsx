import React from 'react';
import { Sparkles, ChevronDown, Globe } from 'lucide-react';
import { formatCurrency } from '../utils/calculations';

export default function Header({
  events,
  activeEventId,
  onSelectEvent,
  onOpenNewEventModal,
  activeTab,
  setActiveTab,
}) {
  const activeEvent = events.find((e) => e.id === activeEventId) || events[0];

  return (
    <header className="sticky top-0 z-40 bg-[#fdfbf7]/90 backdrop-blur-xl border-b border-[#eae3d2] px-4 pt-3 pb-3 shadow-[0_4px_20px_rgb(0,0,0,0.02)]">
      <div className="max-w-md mx-auto flex items-center justify-between gap-3">
        {/* Brand & Event Selector Dropdown */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#c05c3b] mb-0.5">
            <Sparkles className="w-3.5 h-3.5 text-[#d97706] animate-pulse" />
            <span>Merch Order</span>
          </div>

          {activeTab !== 'status' ? (
            <div className="relative group inline-block max-w-full">
              <select
                value={activeEventId}
                onChange={(e) => {
                  if (e.target.value === 'NEW') {
                    onOpenNewEventModal();
                  } else {
                    onSelectEvent(e.target.value);
                  }
                }}
                aria-label="Switch Active Event"
                className="appearance-none bg-[#f4eee2] hover:bg-[#ede5d6] border border-[#ded5c2] rounded-xl py-1.5 pl-3 pr-8 text-sm font-heading font-extrabold text-[#23201c] max-w-full truncate cursor-pointer transition shadow-sm focus:outline-none focus:ring-2 focus:ring-[#c05c3b]/40"
              >
                {events.map((evt) => (
                  <option key={evt.id} value={evt.id} className="bg-[#fdfbf7] text-[#23201c]">
                    {evt.name}
                  </option>
                ))}
                <option value="NEW" className="bg-[#fcfaf6] text-[#c05c3b] font-bold">
                  + Create New Event...
                </option>
              </select>
              <ChevronDown className="w-4 h-4 text-[#7d7568] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          ) : (
            <div className="text-sm font-heading font-extrabold text-[#23201c] py-1.5">
              All Events & Activities
            </div>
          )}
        </div>

        {/* Quick Rate Indicator Pill */}
        {activeEvent && activeTab !== 'status' && (
          <div
            onClick={() => setActiveTab('events')}
            className="flex flex-col items-end shrink-0 bg-gradient-to-br from-[#fcf7ee] to-[#f7f0e3] border border-[#e3d8c4] px-2.5 py-1.5 rounded-xl cursor-pointer hover:border-[#c05c3b]/50 shadow-sm transition active:scale-95"
            title="Click to edit event rates"
          >
            <div className="flex items-center gap-1 text-[10px] font-extrabold text-[#b45309] uppercase tracking-tighter">
              <Globe className="w-3 h-3" />
              <span>{activeEvent.currencyCode || 'LOCAL'} ➔ SGD</span>
            </div>
            <span className="text-xs font-mono font-bold text-[#3d3730]">
              Rate: {activeEvent.exchangeRate}
            </span>
          </div>
        )}
      </div>

      {/* Sub-banner showing active rule */}
      {activeEvent && activeTab !== 'status' && (
        <div className="max-w-md mx-auto mt-2.5 flex items-center justify-between px-3 py-1.5 rounded-xl bg-[#f5efe4] border border-[#e8dfce] text-[11px] text-[#5c5549] shadow-inner">
          <span className="truncate flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${activeEvent.benefitThreshold > 0 ? 'bg-[#10b981] shadow-[0_0_8px_#10b981]' : 'bg-[#a89f91]'}`} />
            <span className="font-bold text-[#2d2822]">Rule:</span> {activeEvent.benefitThreshold > 0 ? `1 Photocard per ${formatCurrency(activeEvent.benefitThreshold, activeEvent.currencyCode)} spent` : 'No Store Benefits (Threshold: 0)'}
          </span>
          <button
            onClick={() => setActiveTab('events')}
            className="text-[#c05c3b] font-extrabold hover:underline shrink-0 ml-2"
          >
            Edit
          </button>
        </div>
      )}
    </header>
  );
}
