import { describe, expect, it } from "vitest";
import { cleanAsk, clip, dropUnbacked, ruleVerdict, trimSentences, unbackedAmounts, validateVerdict } from "@/lib/debate/rules";
import { product, state } from "./helpers";

describe("no invented prices", () => {
  it("flags dollar amounts that aren't backed by known prices (within $1)", () => {
    expect(unbackedAmounts("It's $299.95 at Best Buy, not $500.", [299.95, 379.95])).toEqual([500]);
    expect(unbackedAmounts("About $300 there.", [299.95])).toEqual([]); // within $1
    expect(unbackedAmounts("No prices here.", [])).toEqual([]);
  });

  it("drops only the sentence that carries an unbacked amount", () => {
    expect(dropUnbacked("Great machine. It's $999 somewhere. Buy it!", [299.95])).toBe("Great machine. Buy it!");
  });
});

describe("text limits", () => {
  it("clips at a word boundary with an ellipsis", () => {
    const out = clip("one two three four five six seven", 15);
    expect(out.length).toBeLessThanOrEqual(15);
    expect(out.endsWith("…")).toBe(true);
  });

  it("trims to whole sentences when possible", () => {
    expect(trimSentences("First point here. Second point that is long.", 20)).toBe("First point here.");
  });
});

describe("asks", () => {
  it("accepts a short question with 2 to 4 distinct options", () => {
    expect(cleanAsk({ question: "What's your budget?", options: ["Under $100", "Under $100", "Up to $300"] })).toEqual({
      question: "What's your budget?",
      options: ["Under $100", "Up to $300"],
    });
  });

  it("rejects too few options or over-long ones", () => {
    expect(cleanAsk({ question: "What's your budget?", options: ["Only one"] })).toBeNull();
    expect(cleanAsk({ question: "What's your budget?", options: ["a".repeat(30), "b"] })).toBeNull();
  });
});

describe("verdict validation: the price always comes from the stored offer", () => {
  const p = product("v-1", "Espresso Bar", [["bestbuy.com", 299.95], ["dillards.com", 379.95]]);

  it("recomputes price and savings from the store, ignoring any number from the model", () => {
    const s = state(p, "dillards.com");
    const v = validateVerdict(
      {
        call: "buy_elsewhere",
        headline: "Same machine, cheaper store",
        reasons: ["Best Buy has it for less.", "Same box, same warranty card."],
        productId: "v-1",
        offerId: "v-1:bestbuy.com",
        price: 1, // a model can't set this: the server reads the stored offer
      },
      s,
    );
    expect(v).not.toBeNull();
    expect(v!.price).toBe(299.95);
    expect(v!.savings).toBe(80);
  });

  it("rejects products that were never shown and offers that don't exist", () => {
    const s = state(p, "dillards.com");
    const base = { call: "buy", headline: "Buy it", reasons: ["Good reason one.", "Good reason two."] };
    expect(validateVerdict({ ...base, productId: "never-shown", offerId: "x" }, s)).toBeNull();
    expect(validateVerdict({ ...base, productId: "v-1", offerId: "v-1:fake.com" }, s)).toBeNull();
  });

  it("rejects a headline with an invented price", () => {
    const s = state(p, "dillards.com");
    const v = validateVerdict(
      { call: "buy", headline: "Only $5 today", reasons: ["Reason one here.", "Reason two here."], productId: "v-1", offerId: "v-1:bestbuy.com" },
      s,
    );
    expect(v).toBeNull();
  });
});

describe("rule-based verdict (used when the AI's verdict is invalid)", () => {
  it("sends the user to the cheaper store for the same item", () => {
    const p = product("r-1", "Headphones", [["bose.com", 129], ["bestbuy.com", 235.99]]);
    const v = ruleVerdict(state(p, "bestbuy.com"));
    expect(v.call).toBe("buy_elsewhere");
    expect(v.offerId).toBe("r-1:bose.com");
    expect(v.price).toBe(129);
    expect(v.savings).toBeCloseTo(106.99, 2);
  });

  it("says buy when the pick is already the cheapest and fits", () => {
    const p = product("r-2", "Kettle", [["target.com", 49.99], ["amazon.com", 59.99]]);
    const v = ruleVerdict(state(p, "target.com"));
    expect(v.call).toBe("buy");
    expect(v.price).toBe(49.99);
  });

  it("says wait when the user said it can wait", () => {
    const p = product("r-3", "Desk", [["ikea.com", 299]]);
    const v = ruleVerdict(state(p, "ikea.com", { answers: [{ askId: "a1", from: "spark", question: "Can it wait?", answer: "It can wait" }] }));
    expect(v.call).toBe("wait");
  });
});
