// Test window variation for Nov 24, 2025
const date = new Date('2025-11-24');
const dateStr = date.toISOString().split('T')[0];

// Same hash function from CampaignScheduler
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

// Same seeded random
function seededRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return (x - Math.floor(x)) * 2 - 1; // Returns -1 to +1
}

const seed = hashString(dateStr);
const seededRandomValue = seededRandom(seed);
const windowVariationMinutes = 30;
const variationMinutes = Math.floor(seededRandomValue * windowVariationMinutes);

console.log('Date:', dateStr);
console.log('Seed:', seed);
console.log('Seeded Random (-1 to +1):', seededRandomValue);
console.log('Variation in minutes:', variationMinutes);
console.log('Hours shift:', (variationMinutes / 60).toFixed(2));

// Apply to 9-17 window
const sendingHours = { start: 9, end: 17 };
const variedStart = sendingHours.start + (variationMinutes / 60);
const variedEnd = sendingHours.end + (variationMinutes / 60);

console.log('Original window: 9:00 - 17:00');
console.log('Varied window:', Math.floor(variedStart) + ':00 - ' + Math.floor(variedEnd) + ':00');
