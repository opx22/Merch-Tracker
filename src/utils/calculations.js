/**
 * Converts a price from Local Currency to SGD
 * @param {number} localPrice - Price in local currency
 * @param {number} exchangeRate - Rate where 1 Local = X SGD (e.g. 0.00098 for KRW)
 * @returns {number} Price in SGD
 */
export const convertToSGD = (localPrice, exchangeRate) => {
  if (!localPrice || isNaN(localPrice)) return 0;
  return Number((localPrice * (exchangeRate || 1)).toFixed(2));
};

/**
 * Formats currency values cleanly
 * @param {number} value - Numeric value
 * @param {string} currencySymbol - e.g. '₩', '$', '¥', 'SGD'
 * @param {number} decimals - Decimal places (0 for KRW/JPY if whole, 2 for SGD/USD)
 */
export const formatCurrency = (value, currencyCode = '', decimals = 2) => {
  const num = Number(value || 0);
  const isZeroDecimalCurrency = ['₩', 'KRW', '¥', 'JPY', 'TWD', 'IDR'].includes(currencyCode);
  const finalDecimals = isZeroDecimalCurrency ? 0 : decimals;
  const formattedNum = num.toLocaleString('en-US', {
    minimumFractionDigits: finalDecimals,
    maximumFractionDigits: finalDecimals,
  });
  return currencyCode ? `${currencyCode} ${formattedNum}` : formattedNum;
};

/**
 * Fetches live exchange rate from free public API (open.er-api.com)
 * Returns the rate where 1 Local = X SGD
 * @param {string} currencyCode - e.g. 'KRW', 'JPY', 'USD'
 * @returns {Promise<number>} Exchange rate (1 Local = X SGD)
 */
export const fetchLiveExchangeRate = async (currencyCode = 'KRW') => {
  try {
    const code = currencyCode.toUpperCase().trim();
    if (code === 'SGD') return 1;
    const response = await fetch('https://open.er-api.com/v6/latest/SGD');
    if (!response.ok) throw new Error('Network response was not ok');
    const data = await response.json();
    const rateInLocal = data?.rates?.[code];
    if (rateInLocal && rateInLocal > 0) {
      // Since 1 SGD = rateInLocal Local, then 1 Local = 1 / rateInLocal SGD
      const oneLocalInSgd = 1 / rateInLocal;
      return Number(oneLocalInSgd.toFixed(6));
    }
    throw new Error(`Currency ${code} not found in live rates`);
  } catch (err) {
    console.error('Error pulling live rate:', err);
    throw err;
  }
};

/**
 * Computes all order details and benefit breakdown for a single event
 * Note: Benefit threshold is in LOCAL CURRENCY (e.g. 50000 KRW per 1 PC)
 * @param {Object} event - The event object containing catalog, exchangeRate, benefitThreshold
 * @param {Array} orders - Array of order objects [{ id, personName, isMyOrder, items: { [itemId]: qty } }]
 */
export const calculateEventSummary = (event, orders = []) => {
  const rate = Number(event?.exchangeRate || 1);
  const threshold = Number(event?.benefitThreshold || 50000);
  const catalog = event?.catalog || [];

  const itemMap = new Map();
  catalog.forEach((item) => itemMap.set(item.id, item));

  let totalEventLocalSpend = 0;
  let totalEventSgdSpend = 0;

  let otherRemaindersSum = 0;
  let myOrderIndex = -1;

  const processedOrders = orders.map((order, index) => {
    const isHost = order.isMyOrder || order.orderType === 'host';
    if (isHost) {
      myOrderIndex = index;
    }

    let orderLocalSpend = 0;
    let pcEligibleLocalSpend = 0;
    let totalItemsCount = 0;

    Object.entries(order.items || {}).forEach(([itemId, qty]) => {
      const quantity = Number(qty || 0);
      if (quantity > 0) {
        const item = itemMap.get(itemId);
        if (item) {
          const itemTotalLocal = Number(item.price || 0) * quantity;
          orderLocalSpend += itemTotalLocal;
          totalItemsCount += quantity;
          if (item.countsTowardsBenefit !== false) {
            pcEligibleLocalSpend += itemTotalLocal;
          }
        }
      }
    });

    const orderSgdSpend = convertToSGD(orderLocalSpend, rate);
    const pcEligibleSgdSpend = convertToSGD(pcEligibleLocalSpend, rate);

    totalEventLocalSpend += orderLocalSpend;
    totalEventSgdSpend += orderSgdSpend;

    // Raw Benefit calculated based on LOCAL spend divided by LOCAL threshold
    const rawBenefit = threshold > 0 ? orderLocalSpend / threshold : 0;
    const standardEffectiveBenefit = Math.floor(rawBenefit);
    const standardRemainder = rawBenefit - standardEffectiveBenefit;

    if (!isHost) {
      otherRemaindersSum += standardRemainder;
    }

    return {
      ...order,
      isMyOrder: isHost,
      orderLocalSpend,
      orderSgdSpend,
      pcEligibleSgdSpend,
      totalItemsCount,
      rawBenefit,
      effectiveBenefit: standardEffectiveBenefit,
      remainder: standardRemainder,
      pooledRemaindersAdded: 0,
      combinedRawBenefit: rawBenefit,
    };
  });

  if (myOrderIndex !== -1) {
    const myOrder = processedOrders[myOrderIndex];
    const combinedRaw = myOrder.rawBenefit + otherRemaindersSum;
    const combinedEffective = Math.floor(combinedRaw);
    const finalRemainder = combinedRaw - combinedEffective;

    processedOrders[myOrderIndex] = {
      ...myOrder,
      pooledRemaindersAdded: otherRemaindersSum,
      combinedRawBenefit: combinedRaw,
      effectiveBenefit: combinedEffective,
      remainder: finalRemainder,
    };
  }

  const catalogAggregation = {};
  processedOrders.forEach((order) => {
    Object.entries(order.items || {}).forEach(([itemId, qty]) => {
      const quantity = Number(qty || 0);
      if (quantity > 0) {
        const item = itemMap.get(itemId);
        if (item) {
          if (!catalogAggregation[itemId]) {
            catalogAggregation[itemId] = {
              id: itemId,
              name: item.name || 'Unknown Item',
              price: Number(item.price || 0),
              qty: 0,
              totalLocal: 0,
              totalSgd: 0,
            };
          }
          catalogAggregation[itemId].qty += quantity;
          catalogAggregation[itemId].totalLocal += Number(item.price || 0) * quantity;
          catalogAggregation[itemId].totalSgd = convertToSGD(catalogAggregation[itemId].totalLocal, rate);
        }
      }
    });
  });

  const totalStandardBenefitsWithoutPooling = processedOrders.reduce(
    (acc, ord) => acc + Math.floor(ord.rawBenefit),
    0
  );

  const totalEffectiveBenefits = processedOrders.reduce(
    (acc, ord) => acc + ord.effectiveBenefit,
    0
  );

  const poolingBonusBenefits = totalEffectiveBenefits - totalStandardBenefitsWithoutPooling;

  return {
    processedOrders,
    catalogAggregation,
    totalLocalSpend: totalEventLocalSpend,
    totalSgdSpend: Number(totalEventSgdSpend.toFixed(2)),
    totalEventLocalSpend,
    totalEventSgdSpend: Number(totalEventSgdSpend.toFixed(2)),
    otherRemaindersSum: Number(otherRemaindersSum.toFixed(4)),
    totalEffectiveBenefits,
    poolingBonusBenefits,
  };
};
