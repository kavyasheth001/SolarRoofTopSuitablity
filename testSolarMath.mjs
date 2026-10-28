import { computeScenario, recommendSize, computeSystem } from './src/utils/solarCalculations.js';

let failed = false;

function assert(condition, message) {
  if (!condition) {
    console.error('❌ FAIL:', message);
    failed = true;
  } else {
    console.log('✅ PASS:', message);
  }
}

function approxEqual(a, b, epsilon = 0.5) {
  return Math.abs(a - b) <= epsilon;
}

// Test 1: capacity 40.9 kWp, shadeFactor 1
const t1 = computeScenario({ capacityKwp: 40.9, shadeFactor: 1, annualConsumptionKwh: 0, tariff: 7, exportRate: 0 });
assert(approxEqual(t1.annualGen, 61350), `Annual gen should be 61350, got ${t1.annualGen}`);
assert(approxEqual(t1.dailyAvgGen, 168.1, 0.2), `Daily gen should be 168.1, got ${t1.dailyAvgGen}`);

// Test 2: capacity 40.9, shadeFactor 1, consumption 1000 units/month (12000/yr), tariff 7
const t2 = computeScenario({ capacityKwp: 40.9, shadeFactor: 1, annualConsumptionKwh: 12000, tariff: 7, exportRate: 0 });
assert(approxEqual(t2.annualOffset, 12000), `Offset should be 12000, got ${t2.annualOffset}`);
assert(approxEqual(t2.coveragePct, 100), `Coverage should be 100%, got ${t2.coveragePct}`);
assert(approxEqual(t2.annualSavings, 84000), `Savings should be 84000, got ${t2.annualSavings}`);
assert(approxEqual(t2.surplus, 49350), `Surplus should be 49350, got ${t2.surplus}`);

const r2 = recommendSize({ roofCapacityKwp: 40.9, annualConsumptionKwh: 12000, shadeFactor: 1 });
assert(approxEqual(r2.recommendedKwp, 8.0), `Recommended size should be 8.0, got ${r2.recommendedKwp}`);
assert(r2.roofIsLargerThanNeeded === true, 'Roof should be larger than needed');

// Test 3: consumption 20,000 units/month (240000/yr)
const t3 = computeScenario({ capacityKwp: 40.9, shadeFactor: 1, annualConsumptionKwh: 240000, tariff: 7, exportRate: 0 });
assert(t3.coveragePct < 100, `Coverage should be < 100, got ${t3.coveragePct}`);
assert(approxEqual(t3.annualOffset, t3.annualGen), `Offset (${t3.annualOffset}) should be == gen (${t3.annualGen})`);
assert(t3.surplus === 0, `Surplus should be 0, got ${t3.surplus}`);

// Test 4: savings never exceed billBefore when exportRate = 0; coveragePct never exceeds 100
assert(t2.annualSavings <= t2.billBefore, 'Savings exceed billBefore');
assert(t3.annualSavings <= t3.billBefore, 'Savings exceed billBefore');
assert(t3.coveragePct <= 100, 'Coverage exceeds 100');

// Test 5: shadeFactor 0.8 reduces generation by exactly 20%
const t5 = computeScenario({ capacityKwp: 40.9, shadeFactor: 0.8, annualConsumptionKwh: 0, tariff: 7, exportRate: 0 });
assert(approxEqual(t5.annualGen, t1.annualGen * 0.8), `Gen with SF 0.8 should be ${t1.annualGen * 0.8}, got ${t5.annualGen}`);

// Test 6: panelCount * 330 / 1000 <= roofCapacityKwp always
const s6 = computeSystem(500);
assert(s6.panelCount * 330 / 1000 <= s6.roofCapacityKwp, 'Panel count capacity exceeds roof capacity');

// Test 7: empty or 0 consumption: no crash, savings section shows the prompt
const t7 = computeScenario({ capacityKwp: 40.9, shadeFactor: 1, annualConsumptionKwh: 0, tariff: 7, exportRate: 0 });
assert(t7.assumedFullUse === true, 'assumedFullUse should be true for 0 consumption');

if (failed) {
  process.exit(1);
} else {
  console.log('🎉 All acceptance tests passed!');
}
