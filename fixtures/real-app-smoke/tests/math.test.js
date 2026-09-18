import test from "node:test";
import assert from "node:assert/strict";
import { add } from "../src/math.js";

test("add works", () => {
  assert.equal(add(2, 3), 5);
});
