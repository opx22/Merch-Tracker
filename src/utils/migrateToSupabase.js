/**
 * Merch Tracker Data Migration Utility
 * Transforms client-side JSON event and order data into relational database records
 * and executes batch upserts against Supabase PostgreSQL tables.
 */

export function prepareMigrationData(events = [], ordersMap = {}) {
  const eventsRows = [];
  const catalogRows = [];
  const ordersRows = [];
  const orderItemsRows = [];

  events.forEach((evt) => {
    eventsRows.push({
      id: evt.id,
      name: evt.name,
      currency_code: evt.currencyCode || 'USD',
      exchange_rate: Number(evt.exchangeRate || 1.0),
      benefit_threshold: Number(evt.benefitThreshold || 0),
      era: evt.era || null,
      member: evt.member || null,
    });

    if (Array.isArray(evt.catalog)) {
      evt.catalog.forEach((cat, index) => {
        catalogRows.push({
          id: cat.id,
          event_id: evt.id,
          name: cat.name,
          price: Number(cat.price) || 0,
          comes_with_pc: cat.comesWithPC !== false,
          counts_towards_benefit: cat.countsTowardsBenefit !== false,
          display_order: index + 1,
        });
      });
    }
  });

  Object.entries(ordersMap).forEach(([eventId, ordersList]) => {
    if (!Array.isArray(ordersList)) return;

    ordersList.forEach((ord) => {
      ordersRows.push({
        id: ord.id,
        event_id: eventId === 'standalone_activities' ? null : eventId,
        person_name: ord.personName || 'Me',
        buyer: ord.buyer,
        seller: ord.seller,
        is_my_order: Boolean(ord.isMyOrder),
        order_type: ord.orderType || (ord.isMyOrder ? 'host' : 'taking'),
        activity_type: ord.activityType || 'go',
        item_description: ord.itemDescription || null,
        era: ord.era || null,
        member: ord.member || null,
        status: ord.status || 'unpaid',
        order_date: ord.orderDate || null,
        payment_date: ord.paymentDate || null,
        collection_date: ord.collectionDate || null,
        comment: ord.comment || null,
        billed_amount_sgd: ord.billedAmountSgd !== undefined && ord.billedAmountSgd !== null && ord.billedAmountSgd !== '' ? Number(ord.billedAmountSgd) : null,
      });

      if (ord.items && typeof ord.items === 'object') {
        Object.entries(ord.items).forEach(([compositeKey, qty]) => {
          if (Number(qty) > 0) {
            const [catId, sizeStr] = compositeKey.split('__');
            const size = sizeStr !== undefined ? sizeStr : (ord.itemSizes?.[catId] || null);
            orderItemsRows.push({
              id: `oi-${ord.id}-${compositeKey}`,
              order_id: ord.id,
              catalog_item_id: catId,
              quantity: Number(qty),
              type: size || null,
            });
          }
        });
      }
    });
  });

  return { eventsRows, catalogRows, ordersRows, orderItemsRows };
}

/**
 * Executes the batch migration to Supabase tables.
 */
export async function executeMigration(supabase, events = [], ordersMap = {}, onProgress = null) {
  if (!supabase) {
    throw new Error('Supabase client is not initialized.');
  }

  const log = (msg) => {
    if (typeof onProgress === 'function') {
      onProgress(msg);
    }
  };

  log('Analyzing data structures...');
  const { eventsRows, catalogRows, ordersRows, orderItemsRows } = prepareMigrationData(events, ordersMap);

  // 1. Reconcile & Delete Removed Events
  const validEventIds = new Set(eventsRows.map((e) => e.id));
  const { data: dbEvents } = await supabase.from('events').select('id');
  const deletedEventIds = (dbEvents || []).map((e) => e.id).filter((id) => !validEventIds.has(id));
  if (deletedEventIds.length > 0) {
    await supabase.from('events').delete().in('id', deletedEventIds);
  }

  // 2. Upsert Events
  if (eventsRows.length > 0) {
    log(`Migrating ${eventsRows.length} events...`);
    const { error: eventsError } = await supabase
      .from('events')
      .upsert(eventsRows, { onConflict: 'id' });
    if (eventsError) throw new Error(`Events migration failed: ${eventsError.message}`);
  }

  // 3. Reconcile & Delete Removed Catalog Items
  const validCatalogIds = new Set(catalogRows.map((c) => c.id));
  const { data: dbCatalog } = await supabase.from('catalog_items').select('id');
  const deletedCatalogIds = (dbCatalog || []).map((c) => c.id).filter((id) => !validCatalogIds.has(id));
  if (deletedCatalogIds.length > 0) {
    await supabase.from('order_items').delete().in('catalog_item_id', deletedCatalogIds);
    await supabase.from('catalog_items').delete().in('id', deletedCatalogIds);
  }

  // 4. Upsert Catalog Items
  if (catalogRows.length > 0) {
    log(`Migrating ${catalogRows.length} catalog merchandise items...`);
    const { error: catalogError } = await supabase
      .from('catalog_items')
      .upsert(catalogRows, { onConflict: 'id' });
    if (catalogError) throw new Error(`Catalog migration failed: ${catalogError.message}`);
  }

  // 5. Reconcile & Delete Removed Orders
  const validOrderIds = new Set(ordersRows.map((o) => o.id));
  const { data: dbOrders } = await supabase.from('orders').select('id');
  const deletedOrderIds = (dbOrders || []).map((o) => o.id).filter((id) => !validOrderIds.has(id));
  if (deletedOrderIds.length > 0) {
    log(`Deleting ${deletedOrderIds.length} removed order entries...`);
    await supabase.from('order_items').delete().in('order_id', deletedOrderIds);
    await supabase.from('orders').delete().in('id', deletedOrderIds);
  }

  // 6. Upsert Orders
  if (ordersRows.length > 0) {
    log(`Migrating ${ordersRows.length} group order entries...`);
    const { error: ordersError } = await supabase
      .from('orders')
      .upsert(ordersRows, { onConflict: 'id' });
    if (ordersError) throw new Error(`Orders migration failed: ${ordersError.message}`);
  }

  // 7. Reconcile & Delete Removed Order Items
  const validOrderItemIds = new Set(orderItemsRows.map((oi) => oi.id));
  const { data: dbOrderItems } = await supabase.from('order_items').select('id');
  const deletedOrderItemIds = (dbOrderItems || []).map((oi) => oi.id).filter((id) => !validOrderItemIds.has(id));
  if (deletedOrderItemIds.length > 0) {
    await supabase.from('order_items').delete().in('id', deletedOrderItemIds);
  }

  // 8. Upsert Order Items
  if (orderItemsRows.length > 0) {
    log(`Migrating ${orderItemsRows.length} normalized order line items...`);
    const { error: orderItemsError } = await supabase
      .from('order_items')
      .upsert(orderItemsRows, { onConflict: 'id' });
    if (orderItemsError) throw new Error(`Order items migration failed: ${orderItemsError.message}`);
  }

  log('Data migration successfully completed!');

  return {
    success: true,
    stats: {
      events: eventsRows.length,
      catalogItems: catalogRows.length,
      orders: ordersRows.length,
      orderItems: orderItemsRows.length,
    },
  };
}

/**
 * Fetches all records from Supabase and reconstructs the frontend events and ordersMap state.
 */
export async function fetchFromSupabase(supabase) {
  if (!supabase) throw new Error('Supabase client not initialized.');

  // Fetch tables
  const [{ data: eventsData, error: eErr }, { data: catalogData, error: cErr }, { data: ordersData, error: oErr }, { data: orderItemsData, error: oiErr }] = await Promise.all([
    supabase.from('events').select('*').order('created_at', { ascending: false }),
    supabase.from('catalog_items').select('*').order('display_order', { ascending: true }),
    supabase.from('orders').select('*').order('created_at', { ascending: true }),
    supabase.from('order_items').select('*'),
  ]);

  if (eErr) throw new Error(`Failed to fetch events: ${eErr.message}`);
  if (cErr) throw new Error(`Failed to fetch catalog: ${cErr.message}`);
  if (oErr) throw new Error(`Failed to fetch orders: ${oErr.message}`);
  if (oiErr) throw new Error(`Failed to fetch order items: ${oiErr.message}`);

  // Map order items by order_id
  const itemsByOrder = {};
  const itemSizesByOrder = {};
  (orderItemsData || []).forEach((oi) => {
    if (!itemsByOrder[oi.order_id]) itemsByOrder[oi.order_id] = {};
    if (!itemSizesByOrder[oi.order_id]) itemSizesByOrder[oi.order_id] = {};
    const sizeStr = oi.type || oi.size || '';
    const compositeKey = `${oi.catalog_item_id}__${sizeStr}`;
    itemsByOrder[oi.order_id][compositeKey] = Number(oi.quantity);
    if (oi.type || oi.size) {
      itemSizesByOrder[oi.order_id][oi.catalog_item_id] = oi.type || oi.size;
    }
  });

  // Map catalog items by event_id
  const catalogByEvent = {};
  (catalogData || []).forEach((cat) => {
    if (!catalogByEvent[cat.event_id]) catalogByEvent[cat.event_id] = [];
    catalogByEvent[cat.event_id].push({
      id: cat.id,
      name: cat.name,
      price: Number(cat.price),
      comesWithPC: Boolean(cat.comes_with_pc),
      countsTowardsBenefit: cat.counts_towards_benefit !== false,
    });
  });

  const reconstructedEvents = (eventsData || []).map((evt) => ({
    id: evt.id,
    name: evt.name,
    currencyCode: evt.currency_code,
    exchangeRate: Number(evt.exchange_rate),
    benefitThreshold: Number(evt.benefit_threshold),
    era: evt.era || '',
    member: evt.member || '',
    catalog: catalogByEvent[evt.id] || [],
  }));

  const reconstructedOrdersMap = {};
  (ordersData || []).forEach((ord) => {
    const eventKey = ord.event_id || 'standalone_activities';
    if (!reconstructedOrdersMap[eventKey]) reconstructedOrdersMap[eventKey] = [];
    reconstructedOrdersMap[eventKey].push({
      id: ord.id,
      personName: ord.person_name,
      buyer: ord.buyer,
      seller: ord.seller,
      isMyOrder: Boolean(ord.is_my_order),
      orderType: ord.order_type,
      activityType: ord.activity_type || 'go',
      itemDescription: ord.item_description || '',
      era: ord.era || '',
      member: ord.member || '',
      status: ord.status,
      orderDate: ord.order_date || '',
      paymentDate: ord.payment_date || '',
      collectionDate: ord.collection_date || '',
      comment: ord.comment || '',
      billedAmountSgd: ord.billed_amount_sgd !== null && ord.billed_amount_sgd !== undefined ? Number(ord.billed_amount_sgd) : null,
      items: itemsByOrder[ord.id] || {},
      itemSizes: itemSizesByOrder[ord.id] || {},
    });
  });

  return { events: reconstructedEvents, ordersMap: reconstructedOrdersMap };
}
