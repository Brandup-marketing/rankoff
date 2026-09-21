// The price that takes a position on a board: one whole currency unit above
// the total that holds it, and never below the board's minimum payment.
//
// The minimum is the smallest payment; it is not the step. While the step was
// the minimum, a US$100 minimum quoted "leader + US$100": US$105 for a place
// that any US$100 payment already takes while every total sits below US$5.
// Converted legacy totals can carry cents and new payments are whole units, so
// the quote is always a whole unit strictly above the holder (a tie loses,
// because it settles later). app.js mirrors this as priceAbove(); a test
// checks that the two agree.
export const WHOLE_UNIT_MINOR = 100;

export function priceAboveMinor(holderMinor, floorMinor) {
  const holder = Math.max(0, Number(holderMinor) || 0);
  const above = (Math.floor(holder / WHOLE_UNIT_MINOR) + 1) * WHOLE_UNIT_MINOR;
  const floor = Number(floorMinor) > 0 ? Number(floorMinor) : WHOLE_UNIT_MINOR;
  return Math.max(floor, above);
}
