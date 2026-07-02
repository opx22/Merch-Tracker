import React from 'react';
import { ShoppingBag, Users, Calendar, ClipboardCheck } from 'lucide-react';

export default function BottomNav({ activeTab, setActiveTab, ordersCount, catalogCount }) {
  const navItems = [
    {
      id: 'orders',
      label: 'Orders',
      icon: Users,
      badge: ordersCount > 0 ? ordersCount : null,
    },
    {
      id: 'catalog',
      label: 'Catalog',
      icon: ShoppingBag,
      badge: catalogCount > 0 ? catalogCount : null,
    },
    {
      id: 'events',
      label: 'Events',
      icon: Calendar,
    },
    {
      id: 'status',
      label: 'Status',
      icon: ClipboardCheck,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#fdfbf7]/95 backdrop-blur-2xl border-t border-[#eae3d2] px-2 pb-safe pt-2 shadow-[0_-8px_30px_rgb(0,0,0,0.04)]">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`relative flex flex-col items-center justify-center py-1.5 px-2.5 rounded-2xl transition duration-200 active:scale-95 min-w-[56px] ${
                isActive
                  ? 'text-[#c05c3b] bg-[#c05c3b]/12 font-bold shadow-sm'
                  : 'text-[#857b6d] hover:text-[#2c2824] hover:bg-[#f3ede1]/60'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 stroke-[2.5px]' : 'stroke-2'}`} />
                {item.badge && (
                  <span className="absolute -top-1.5 -right-2.5 bg-[#2c2824] text-white text-[9px] font-bold px-1 py-0.2 rounded-full min-w-[15px] text-center shadow-sm">
                    {item.badge}
                  </span>
                )}
                {item.highlightBadge && (
                  <span className="absolute -top-2 -right-6 bg-gradient-to-r from-[#c05c3b] to-[#d97706] text-white text-[9px] font-black px-1.5 py-0.2 rounded-full shadow-sm animate-bounce-subtle whitespace-nowrap">
                    {item.highlightBadge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] mt-1 tracking-tight ${isActive ? 'font-extrabold text-[#c05c3b]' : 'font-semibold'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
