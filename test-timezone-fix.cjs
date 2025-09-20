#!/usr/bin/env node
const { formatInTimeZone } = require('date-fns-tz');

console.log('🧪 Testing the timezone fix...\n');

// Simulate the problem timestamp from backend
const backendTimestamp = "2025-09-22T07:00:00";

console.log('Backend sends:', backendTimestamp);

// Test BEFORE fix (how frontend was processing it)
const dateObjBefore = new Date(backendTimestamp);
console.log('\n❌ BEFORE fix:');
console.log('new Date(timestamp):', dateObjBefore.toISOString());
const resultBefore = formatInTimeZone(dateObjBefore, 'Europe/Rome', 'MMM d, yyyy h:mm a');
console.log('formatInTimeZone result:', resultBefore);

// Test AFTER fix (add Z suffix to force UTC interpretation)
const dateObjAfter = new Date(backendTimestamp + 'Z');
console.log('\n✅ AFTER fix:');
console.log('new Date(timestamp + "Z"):', dateObjAfter.toISOString());
const resultAfter = formatInTimeZone(dateObjAfter, 'Europe/Rome', 'MMM d, yyyy h:mm a');
console.log('formatInTimeZone result:', resultAfter);

console.log('\n📊 Summary:');
console.log(`Before fix: "${backendTimestamp}" → "${resultBefore}"`);
console.log(`After fix:  "${backendTimestamp}" → "${resultAfter}"`);
