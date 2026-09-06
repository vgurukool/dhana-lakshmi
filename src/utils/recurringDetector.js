export function normalizeMerchantName(merchant) {
  if (!merchant) return '';
  let str = String(merchant).toLowerCase().trim();
  str = str.replace(/#\s*\d+$/g, '');
  str = str.replace(/\b[0-9a-z]{8,}\b/gi, '');
  str = str.replace(/[^\w\s]/gi, ' ');
  str = str.replace(/\s+/g, ' ').trim();
  return str;
}

const SUBSCRIPTION_HINTS = [
  'netflix', 'spotify', 'hulu', 'disney', 'youtube', 'icloud', 'dropbox',
  'adobe', 'microsoft', 'amazon prime', 'patreon', 'membership', 'studio',
  'gym', 'openai', 'chatgpt', 'canva', 'notion', 'zoom', 'slack', 'github', 'tmobile', 'att'
];

const RECURRING_HINTS = [
  'mortgage', 'rent', 'loan', 'insurance', 'utility', 'utilities',
  'electric', 'water', 'internet', 'phone', 'mobile', 'daycare',
  'tuition', 'lease', 'car payment', 'auto payment', 'hoa', 'property tax'
];

export function detectRecurringPatterns(transactions, dismissedPatterns = [], confirmedList = []) {
  const dismissedSet = new Set(dismissedPatterns);

  const confirmedNames = new Set([
    ...confirmedList.map(c => normalizeMerchantName(c.name || c.service || ''))
  ]);

  const expenses = transactions.filter(t => t.type === 'expense' && t.amount > 0);

  const grouped = {};
  for (const t of expenses) {
    const norm = normalizeMerchantName(t.merchant);
    if (!norm) continue;
    if (!grouped[norm]) grouped[norm] = [];
    grouped[norm].push(t);
  }

  const suggestions = [];

  for (const [normMerchant, items] of Object.entries(grouped)) {
    if (dismissedSet.has(normMerchant)) continue;
    if (confirmedNames.has(normMerchant)) continue;

    const sorted = [...items].sort((a, b) => new Date(a.date) - new Date(b.date));

    const uniqueDateItems = [];
    const seenDates = new Set();
    for (const item of sorted) {
      if (!seenDates.has(item.date)) {
        seenDates.add(item.date);
        uniqueDateItems.push(item);
      }
    }

    const lastItem = uniqueDateItems[uniqueDateItems.length - 1];
    const displayCategory = lastItem.category || '';
    const displayTags = lastItem.tags || [];
    const catTagStr = `${displayCategory} ${displayTags.join(' ')}`.toLowerCase();

    const isSubscriptionExplicit = displayCategory.toLowerCase() === 'subscriptions' || catTagStr.includes('subscription');

    // Allow single-transaction entries if explicitly categorized or tagged as Subscriptions
    if (uniqueDateItems.length < 2 && !isSubscriptionExplicit) continue;

    let cadence = null;
    let avgInterval = 30;

    if (uniqueDateItems.length >= 2) {
      const intervals = [];
      for (let i = 1; i < uniqueDateItems.length; i++) {
        const d1 = new Date(uniqueDateItems[i - 1].date);
        const d2 = new Date(uniqueDateItems[i].date);
        const diffDays = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
        intervals.push(diffDays);
      }

      avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

      if (avgInterval >= 5 && avgInterval <= 9) cadence = 'weekly';
      else if (avgInterval >= 12 && avgInterval <= 17) cadence = 'biweekly';
      else if (avgInterval >= 24 && avgInterval <= 40) cadence = 'monthly';
      else if (avgInterval >= 75 && avgInterval <= 110) cadence = 'quarterly';
      else if (avgInterval >= 330 && avgInterval <= 400) cadence = 'annual';
    }

    if (!cadence && isSubscriptionExplicit) {
      cadence = 'monthly';
    }

    if (!cadence) continue;

    const amounts = uniqueDateItems.map(x => Number(x.amount));
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;

    const isSubscriptionHint = SUBSCRIPTION_HINTS.some(h => normMerchant.includes(h)) || isSubscriptionExplicit;
    const isRecurringHint = RECURRING_HINTS.some(h => normMerchant.includes(h)) || catTagStr.includes('recurring') || catTagStr.includes('utility') || catTagStr.includes('bill');

    let targetType = (isSubscriptionHint || isSubscriptionExplicit) ? 'subscription' : 'recurring';

    let monthlyEquivalent = avgAmount;
    if (cadence === 'weekly') monthlyEquivalent = (avgAmount * 52) / 12;
    else if (cadence === 'biweekly') monthlyEquivalent = (avgAmount * 26) / 12;
    else if (cadence === 'monthly') monthlyEquivalent = avgAmount;
    else if (cadence === 'quarterly') monthlyEquivalent = avgAmount / 3;
    else if (cadence === 'annual') monthlyEquivalent = avgAmount / 12;

    const lastDate = new Date(lastItem.date);
    const nextDate = new Date(lastDate);
    if (cadence === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
    else if (cadence === 'biweekly') nextDate.setDate(nextDate.getDate() + 14);
    else if (cadence === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
    else if (cadence === 'quarterly') nextDate.setMonth(nextDate.getMonth() + 3);
    else if (cadence === 'annual') nextDate.setFullYear(nextDate.getFullYear() + 1);

    const nextDateIso = nextDate.toISOString().split('T')[0];

    suggestions.push({
      patternKey: normMerchant,
      merchant: lastItem.merchant,
      normalizedMerchant: normMerchant,
      category: displayCategory || 'Subscriptions',
      cadence,
      type: targetType,
      occurrenceCount: uniqueDateItems.length,
      averageAmount: avgAmount,
      monthlyEquivalent,
      confidence: isSubscriptionExplicit ? 'High (Category)' : (uniqueDateItems.length >= 2 ? 'High' : 'Likely'),
      nextExpectedDate: nextDateIso,
      sampleAccount: lastItem.account || 'Main Checking'
    });
  }

  return suggestions;
}
