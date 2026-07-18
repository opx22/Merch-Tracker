"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import EventDashboard from './components/EventDashboard';
import CatalogManager from './components/CatalogManager';
import OrdersManager from './components/OrdersManager';
import StatusTracker from './components/StatusTracker';

import { calculateEventSummary } from './utils/calculations';
import { getSupabaseClient } from './lib/supabaseClient';
import { fetchFromSupabase, executeMigration } from './utils/migrateToSupabase';

export default function App() {
  const sanitizeName = (name) => {
    if (!name) return name;
    if (name.includes('Host GO') || name.includes('My Order') || name === 'Alex (Host GO)' || name === 'My Order (Host)' || name.includes('(Host)')) {
      return 'Me';
    }
    return name.replace(/\s*\(\s*Host\s*(GO)?\s*\)/gi, '').trim();
  };

  // Load initial data from localStorage — SSR safe, Supabase is source of truth
  const [events, setEvents] = useState(() => {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem('merch_tracker_events_v1');
    const list = saved ? JSON.parse(saved) : [];
    list.forEach((e) => {
      if (e.id === 'standalone_activities') {
        e.name = '📦 Standalone Purchases & Sales';
      }
    });
    return list.filter((e) => e.id !== 'standalone_activities' && e.id !== 'standalone');
  });

  const [ordersMap, setOrdersMap] = useState(() => {
    if (typeof window === 'undefined') return {};
    const saved = localStorage.getItem('merch_tracker_orders_v1');
    const rawMap = saved ? JSON.parse(saved) : {};
    const cleanMap = {};
    Object.keys(rawMap).forEach((eventId) => {
      if (eventId === 'standalone') return; // skip old standalone
      cleanMap[eventId] = (rawMap[eventId] || []).map((ord) => {
        const isHost = ord.isMyOrder || ord.orderType === 'host';
        const role = ord.orderType || (isHost ? 'host' : 'taking');
        const cleanPerson = isHost ? 'Me' : sanitizeName(ord.personName);
        return {
          ...ord,
          personName: cleanPerson,
          buyer: ord.buyer,
          seller: ord.seller,
          orderType: role,
          activityType: ord.activityType || 'go',
          itemDescription: ord.itemDescription || '',
          era: ord.era || '',
          member: ord.member || '',
          items: ord.items || {},
        };
      });
    });
    return cleanMap;
  });

  const [activeEventId, setActiveEventId] = useState(() => {
    return events[0]?.id || '';
  });

  const [activeTab, setActiveTab] = useState('status'); // 'status' | 'orders' | 'catalog' | 'events'
  const [showNewEventModalFromHeader, setShowNewEventModalFromHeader] = useState(false);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isInitializedFromDb, setIsInitializedFromDb] = useState(false);

  // Initial connection to Supabase DB on mount
  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    setIsSupabaseConnected(true);
    setIsSyncing(true);

    fetchFromSupabase(supabase)
      .then(({ events: fetchedEvents, ordersMap: fetchedOrdersMap }) => {
        setIsSyncing(false);
        setIsInitializedFromDb(true);
        if (fetchedEvents && fetchedEvents.length > 0) {
          const list = [...fetchedEvents];
          setEvents(list.filter((e) => e.id !== 'standalone_activities' && e.id !== 'standalone'));
          setOrdersMap(fetchedOrdersMap);
          const firstValidEvent = list.find((e) => e.id !== 'standalone_activities' && e.id !== 'standalone');
          setActiveEventId(firstValidEvent?.id || '');
        } else {
          // If Supabase database is empty of events, but might have standalone orders
          setEvents([]);
          setOrdersMap(fetchedOrdersMap || {});
          setActiveEventId('');
          setActiveTab('events');
        }
      })
      .catch((err) => {
        console.error('Supabase fetch failed:', err);
        setIsSyncing(false);
        setIsInitializedFromDb(true);
      });
  }, []);

  // Sync to localStorage (SSR safe — useEffect only runs client-side)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('merch_tracker_events_v1', JSON.stringify(events));
    }
  }, [events]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('merch_tracker_orders_v1', JSON.stringify(ordersMap));
    }
  }, [ordersMap]);

  // Real-time synchronization to Supabase DB when state updates
  useEffect(() => {
    if (!isInitializedFromDb) return;
    const supabase = getSupabaseClient();
    if (!supabase || !isSupabaseConnected) return;

    setIsSyncing(true);
    const timer = setTimeout(() => {
      executeMigration(supabase, events, ordersMap)
        .then(() => setIsSyncing(false))
        .catch((err) => {
          console.error('Supabase live sync failed:', err);
          alert('Failed to sync to database: ' + err.message);
          setIsSyncing(false);
        });
    }, 300);

    return () => clearTimeout(timer);
  }, [events, ordersMap, isInitializedFromDb, isSupabaseConnected]);



  const activeEvent = useMemo(() => {
    return events.find((e) => e.id === activeEventId) || events[0];
  }, [events, activeEventId]);

  const activeOrders = useMemo(() => {
    if (!activeEvent) return [];
    return ordersMap[activeEvent.id] || [];
  }, [ordersMap, activeEvent]);

  // Compute event summary calculations
  const summaryData = useMemo(() => {
    if (!activeEvent) return { processedOrders: [] };
    return calculateEventSummary(activeEvent, activeOrders);
  }, [activeEvent, activeOrders]);

  // Handlers for Event actions
  const handleCreateEvent = (newEvent) => {
    setEvents((prev) => [newEvent, ...prev]);
    setOrdersMap((prev) => ({
      ...prev,
      [newEvent.id]: [
        {
          id: `ord-init-${Date.now()}`,
          personName: 'Me',
          buyer: 'Me',
          seller: 'Me',
          isMyOrder: true,
          orderType: 'host',
          items: {},
        },
      ],
    }));
    setActiveEventId(newEvent.id);
  };

  const handleUpdateEvent = (eventId, updatedEvent) => {
    setEvents((prev) => prev.map((evt) => (evt.id === eventId ? updatedEvent : evt)));
  };

  const handleDeleteEvent = (eventId) => {
    const remainingEvents = events.filter((e) => e.id !== eventId);
    setEvents(remainingEvents);
    const updatedOrdersMap = { ...ordersMap };
    delete updatedOrdersMap[eventId];
    setOrdersMap(updatedOrdersMap);

    if (activeEventId === eventId) {
      setActiveEventId(remainingEvents[0]?.id || '');
    }

    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConnected) {
      supabase.from('events').delete().eq('id', eventId).then();
    }
  };

  // Handlers for Catalog actions inside active event
  const handleUpdateCatalog = (newCatalog) => {
    if (!activeEvent) return;
    setEvents((prev) =>
      prev.map((evt) => (evt.id === activeEvent.id ? { ...evt, catalog: newCatalog } : evt))
    );
  };

  // Handlers for Orders actions inside active event
  const handleUpdateOrders = (newOrders) => {
    if (!activeEvent) return;
    setOrdersMap((prev) => ({
      ...prev,
      [activeEvent.id]: newOrders,
    }));
  };

  const handleUpdateOrdersForEvent = (eventId, newOrders) => {
    setOrdersMap((prev) => ({
      ...prev,
      [eventId]: newOrders,
    }));
  };

  const handleSetMyOrder = (orderId) => {
    if (!activeEvent) return;
    const currentOrders = ordersMap[activeEvent.id] || [];
    const updated = currentOrders.map((ord) => ({
      ...ord,
      isMyOrder: ord.id === orderId,
    }));
    handleUpdateOrders(updated);
  };

  return (
    <div className="min-h-screen bg-[#f8f6f0] text-[#2c2824] flex flex-col font-sans selection:bg-[#c05c3b] selection:text-white">
      {/* Sticky Header */}
      <Header
        events={events}
        activeEventId={activeEvent?.id || ''}
        onSelectEvent={setActiveEventId}
        onOpenNewEventModal={() => {
          setActiveTab('events');
          setShowNewEventModalFromHeader(true);
        }}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isSupabaseConnected={isSupabaseConnected}
        isSyncing={isSyncing}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full relative">
        {activeTab === 'orders' && (
          <OrdersManager
            activeEvent={activeEvent}
            processedOrders={summaryData.processedOrders || []}
            summaryData={summaryData}
            onUpdateOrders={handleUpdateOrders}
            onSetMyOrder={handleSetMyOrder}
            onUpdateCatalog={handleUpdateCatalog}
          />
        )}

        {activeTab === 'status' && (
          <StatusTracker
            events={events}
            ordersMap={ordersMap}
            activeEventId={activeEvent?.id || ''}
            onUpdateOrdersForEvent={handleUpdateOrdersForEvent}
          />
        )}

        {activeTab === 'catalog' && (
          <CatalogManager
            activeEvent={activeEvent}
            onUpdateCatalog={handleUpdateCatalog}
          />
        )}

        {activeTab === 'events' && (
          <EventDashboard
            events={events}
            activeEventId={activeEvent?.id || ''}
            onSelectEvent={(id) => {
              setActiveEventId(id);
              setActiveTab('orders');
            }}
            onCreateEvent={handleCreateEvent}
            onUpdateEvent={handleUpdateEvent}
            onDeleteEvent={handleDeleteEvent}
            showCreateModalFromHeader={showNewEventModalFromHeader}
            onCloseCreateModalFromHeader={() => setShowNewEventModalFromHeader(false)}
          />
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        ordersCount={activeOrders.length}
        catalogCount={activeEvent?.catalog?.length || 0}
      />
    </div>
  );
}
