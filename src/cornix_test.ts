import {
    calculateWeightedAverage,
    makeAutomaticLeverageAdjustment,
    mapPriceTargets,
    PriceTargetWithPrice
} from "./cornix.ts";
import { assertEquals } from "https://deno.land/std@0.188.0/testing/asserts.ts";

Deno.test(function evenlyDistributedPriceTargets() {
  const orderTargets = [ 1, 2, 3, 4, 5, 6, 7, 8 ];
  const result = mapPriceTargets(orderTargets, 'Evenly Divided');
  const expected: PriceTargetWithPrice[] = [
    { id: 1, price: 1, percentage: 100/8 },
    { id: 2, price: 2, percentage: 100/8 },
    { id: 3, price: 3, percentage: 100/8 },
    { id: 4, price: 4, percentage: 100/8 },
    { id: 5, price: 5, percentage: 100/8 },
    { id: 6, price: 6, percentage: 100/8 },
    { id: 7, price: 7, percentage: 100/8 },
    { id: 8, price: 8, percentage: 100/8 },
  ];

  assertEquals(result, expected);
});

Deno.test(function oneTarget() {
  const orderTargets = [ 10, 20, 30 ];
  const result = mapPriceTargets(orderTargets, 'One Target');
  const expected = [ { id: 1, price: 10, percentage: 100 }];

  assertEquals(result, expected);
});

Deno.test(function twoTargets() {
  const orderTargets = [ 10, 20, 30 ];
  const result = mapPriceTargets(orderTargets, 'Two Targets');
  const expected = [
    { id: 1, price: 10, percentage: 50 },
    { id: 2, price: 20, percentage: 50 },
  ];

  assertEquals(result, expected);
});

Deno.test(function threeTargets() {
  const orderTargets = [ 10, 20, 30 ];
  const result = mapPriceTargets(orderTargets, 'Three Targets');
  const expected = [
    { id: 1, price: 10, percentage: 33.33 },
    { id: 2, price: 20, percentage: 33.33 },
    { id: 3, price: 30, percentage: 33.33 },
  ];

  assertEquals(result, expected);
});

Deno.test(function fiftyOnFirstTarget() {
  const orderTargets = [ 10, 20, 30, 40, 50 ];
  const result = mapPriceTargets(orderTargets, 'Fifty On First Target');
  const expected = [
    { id: 1, price: 10, percentage: 100/2 },
    { id: 2, price: 20, percentage: 100/2/4 },
    { id: 3, price: 30, percentage: 100/2/4 },
    { id: 4, price: 40, percentage: 100/2/4 },
    { id: 5, price: 50, percentage: 100/2/4 },
  ];

  assertEquals(result, expected);
});

Deno.test(function increasingExponential() {
  const orderTargets = [ 10, 20, 30, 40, 50 ];
  const result = mapPriceTargets(orderTargets, 'Increasing Exponential');
  const expected = [
    { id: 1, price: 10, percentage: 3.225806451612903 },
    { id: 2, price: 20, percentage: 6.451612903225806 },
    { id: 3, price: 30, percentage: 12.903225806451612 },
    { id: 4, price: 40, percentage: 25.806451612903224 },
    { id: 5, price: 50, percentage: 51.61290322580645 },
  ];

  assertEquals(result, expected);
});

Deno.test(function decreasingExponential() {
  const orderTargets = [ 10, 20, 30, 40, 50 ];
  const result = mapPriceTargets(orderTargets, 'Decreasing Exponential');
  const expected = [
    { id: 1, price: 10, percentage: 51.61290322580645 },
    { id: 2, price: 20, percentage: 25.806451612903224 },
    { id: 3, price: 30, percentage: 12.903225806451612 },
    { id: 4, price: 40, percentage: 6.451612903225806 },
    { id: 5, price: 50, percentage: 3.225806451612903 },
  ];

  assertEquals(result, expected);
});

Deno.test(function skipFirst() {
  const orderTargets = [ 10, 20, 30, 40, 50 ];
  const result = mapPriceTargets(orderTargets, 'Skip First');
  const expected = [
    { id: 1, price: 10, percentage: 0 },
    { id: 2, price: 20, percentage: 100/4 },
    { id: 3, price: 30, percentage: 100/4 },
    { id: 4, price: 40, percentage: 100/4 },
    { id: 5, price: 50, percentage: 100/4 },
  ];

  assertEquals(result, expected);
});

Deno.test(function customWithSameAmountAsTargets() {
  const orderTargets = [ 10, 20, 30, 40, 50, 60, 70, 80 ];
  const result = mapPriceTargets(orderTargets, [
    { percentage: 30 },
    { percentage: 10 },
    { percentage: 10 },
    { percentage: 10 },
    { percentage: 10 },
    { percentage: 10 },
    { percentage: 10 },
    { percentage: 10 },
    { percentage: 10 },

  ]);
  const expected = [
    { id: 1, price: 10, percentage: 30 },
    { id: 2, price: 20, percentage: 10 },
    { id: 3, price: 30, percentage: 10 },
    { id: 4, price: 40, percentage: 10 },
    { id: 5, price: 50, percentage: 10 },
    { id: 6, price: 60, percentage: 10 },
    { id: 7, price: 70, percentage: 10 },
    { id: 8, price: 80, percentage: 10 },
  ];

  assertEquals(result, expected);
});

Deno.test(function customWithLessAmountsThenTargets() {
  const orderTargets = [ 10, 20, 30, 40, 50, 60, 70, 80 ];
  const result = mapPriceTargets(orderTargets, [
    { percentage: 30 },
    { percentage: 10 },
    { percentage: 10 },
    { percentage: 10 },
    { percentage: 10 },
    { percentage: 10 },
    { percentage: 10 },
    { percentage: 10 },
    { percentage: 10 },

  ]);
  const expected = [
    { id: 1, price: 10, percentage: 30 },
    { id: 2, price: 20, percentage: 10 },
    { id: 3, price: 30, percentage: 10 },
    { id: 4, price: 40, percentage: 10 },
    { id: 5, price: 50, percentage: 10 },
    { id: 6, price: 60, percentage: 10 },
    { id: 7, price: 70, percentage: 10 },
    { id: 8, price: 80, percentage: 10 },
  ];

  // assertEquals(result, expected);
  console.trace('TODO: Find out how this should behave and fix the test');
});

Deno.test(function customWithMoreAmountsThenTargets_ShouldProportionallyDistributeValues() {
  const orderTargets = [ 10, 20, 30, 40, 50 ];
  const result = mapPriceTargets(orderTargets, [
    { percentage: 30 }, // 46 13
    { percentage: 10 },
    { percentage: 10 },
    { percentage: 10 },
    { percentage: 10 },
    { percentage: 10 },
    { percentage: 10 },
    { percentage: 10 },
    { percentage: 10 },
  ]);

  const expected = [
    { id: 1, price: 10, percentage: 30 },
    { id: 2, price: 20, percentage: 10 },
    { id: 3, price: 30, percentage: 10 },
    { id: 4, price: 40, percentage: 10 },
    { id: 5, price: 50, percentage: 10 },
    { id: 6, price: 60, percentage: 10 },
    { id: 7, price: 70, percentage: 10 },
    { id: 8, price: 80, percentage: 10 },
  ];

  // assertEquals(result, expected);
  console.trace('TODO: Find out how this should behave and fix the test');
});

Deno.test(function makeAutomaticLeverageAdjustmentWithoutLeverage() {
    const leverage = 1;
    const percentage = 5/100;
    const expected = 5/100;
    const result = makeAutomaticLeverageAdjustment(percentage, leverage, true);

    assertEquals(result, expected);
});

Deno.test(function makeAutomaticLeverageAdjustmentWithLeverage() {
    const leverage = 10;
    const percentage = 5/100;
    const expected = 5/1000;
    const result = makeAutomaticLeverageAdjustment(percentage, leverage, true);

    assertEquals(result, expected);
});

Deno.test(function testMakeAutomaticLeverageAdjustmentBelowMinForTrailing() {
  const leverage = 50;
  const percentage = 2/100;
  const expected = 2/1000;
  const result = makeAutomaticLeverageAdjustment(percentage, leverage, true);

  assertEquals(result, expected);
});

Deno.test(function testMakeAutomaticLeverageAdjustmentBelowMinNotTrailing() {
    const leverage = 50;
    const percentage = 2/100;
    const expected = 2/100/50;
    const result = makeAutomaticLeverageAdjustment(percentage, leverage, false);

    assertEquals(result, expected);
});

Deno.test(function testCalculateWeightedAverage() {
  const input = [
    { id: 1, price: 50, percentage: 75/100  },
    { id: 2, price: 100, percentage: 25/100 },
  ];

  const expected = 62.5;
  const result = calculateWeightedAverage(input);

  assertEquals(result, expected);
});
