import test from "node:test";
import assert from "node:assert/strict";
import { buyerFrom } from "../../functions/api/webhooks/dodo.js";

test("the buyer is lifted out of a real payment.succeeded payload", () => {
  const buyer = buyerFrom({
    customer: { customer_id: "cus_1", email: "owner@example.com", name: "Owner Name", phone_number: "+60123456789" },
    billing: { country: "MY", state: "Johor", city: "Nusajaya", street: "5, Jalan Example", zipcode: "79100" },
    invoice_url: "https://live.dodopayments.com/invoices/payments/pay_1",
    card_last_four: "0566",
    card_network: "visa",
  });
  assert.equal(buyer.email, "owner@example.com");
  assert.equal(buyer.phone, "+60123456789");
  assert.equal(buyer.country, "MY");
  assert.equal(buyer.zipcode, "79100");
  assert.equal(buyer.cardLastFour, "0566");
});

test("a payload without a buyer settles the payment instead of failing it", () => {
  for (const payload of [{}, { customer: null, billing: undefined }, { customer: { email: "  " } }]) {
    const buyer = buyerFrom(payload);
    assert.equal(buyer.email, null);
    assert.equal(buyer.phone, null);
    assert.equal(buyer.country, null);
  }
});

test('the provider\'s literal "None" is not stored as contact detail', () => {
  const buyer = buyerFrom({ customer: { name: "None" }, card_last_four: "None" });
  assert.equal(buyer.name, null);
  assert.equal(buyer.cardLastFour, null);
});
