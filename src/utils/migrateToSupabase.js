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
    });

    if (Array.isArray(evt.catalog)) {
      evt.catalog.forEach((cat, index) => {
        catalogRows.push({
          id: cat.id,
          event_id: evt.id,
          name: cat.name,
          price: Number(cat.price || 0),
          comes_with_pc: Boolean(cat.comesWithPC),
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
        event_id: eventId,
        person_name: ord.personName || 'Me',
        buyer: ord.buyer || ord.personName || 'Me',
        seller: ord.seller || 'Official Store',
        is_my_order: Boolean(ord.isMyOrder),
        order_type: ord.orderType || (ord.isMyOrder ? 'host' : 'taking'),
        status: ord.status || 'unpaid',
        order_date: ord.orderDate || null,
        payment_date: ord.paymentDate || null,
        collection_date: ord.collectionDate || null,
        comment: ord.comment || null,
      });

      if (ord.items && typeof ord.items === 'object') {
        Object.entries(ord.items).forEach(([catId, qty]) => {
          if (Number(qty) > 0) {
            orderItemsRows.push({
              id: `oi-${ord.id}-${catId}`,
              order_id: ord.id,
              catalog_item_id: catId,
              quantity: Number(qty),
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

  // 1. Upsert Events
  log(`Migrating ${eventsRows.length} events...`);
  const { error: eventsError } = await supabase
    .from('events')
    .upsert(eventsRows, { onConflict: 'id' });
  if (eventsError) throw new Error(`Events migration failed: ${eventsError.message}`);

  // 2. Upsert Catalog Items
  log(`Migrating ${catalogRows.length} catalog merchandise items...`);
  const { error: catalogError } = await supabase
    .from('catalog_items')
    .upsert(catalogRows, { onConflict: 'id' });
  if (catalogError) throw new Error(`Catalog migration failed: ${catalogError.message}`);

  // 3. Upsert Orders
  log(`Migrating ${ordersRows.length} group order entries...`);
  const { error: ordersError } = await supabase
    .from('orders')
    .upsert(ordersRows, { onConflict: 'id' });
  if (ordersError) throw new Error(`Orders migration failed: ${ordersError.message}`);

  // 4. Upsert Order Items
  log(`Migrating ${orderItemsRows.length} normalized order line items...`);
  const { error: orderItemsError } = await supabase
    .from('order_items')
    .upsert(orderItemsRows, { onConflict: 'id' });
  if (orderItemsError) throw new Error(`Order items migration failed: ${orderItemsError.message}`);

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
  (orderItemsData || []).forEach((oi) => {
    if (!itemsByOrder[oi.order_id]) itemsByOrder[oi.order_id] = {};
    itemsByOrder[oi.order_id][oi.catalog_item_id] = Number(oi.quantity);
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
    catalog: catalogByEvent[evt.id] || [],
  }));

  const reconstructedOrdersMap = {};
  (ordersData || []).forEach((ord) => {
    const eventKey = ord.event_id || 'standalone';
    if (!reconstructedOrdersMap[eventKey]) reconstructedOrdersMap[eventKey] = [];
    reconstructedOrdersMap[eventKey].push({
      id: ord.id,
      personName: ord.person_name,
      buyer: ord.buyer,
      seller: ord.seller,
      isMyOrder: Boolean(ord.is_my_order),
      orderType: ord.order_type,
      status: ord.status,
      orderDate: ord.order_date || '',
      paymentDate: ord.payment_date || '',
      collectionDate: ord.collection_date || '',
      comment: ord.comment || '',
      items: itemsByOrder[ord.id] || {},
    });
  });

  return { events: reconstructedEvents, ordersMap: reconstructedOrdersMap };
}
