import { test } from "node:test";
import assert from "node:assert/strict";
import { TELEFONO_REGEX, pulisciTelefono, telefonoValido } from "../js/utils/contatti.js";

test("numeri di telefono di iscrizioni e rose", () => {
  assert.equal(pulisciTelefono("+39 333.123-45/67 (0)"), "+393331234567" + "0");
  assert.ok(telefonoValido("333 1234567"));
  assert.ok(telefonoValido("+39 333 1234567"));
  assert.ok(!telefonoValido("12345"));
  assert.ok(!telefonoValido("333-abc-4567"));
  assert.ok(TELEFONO_REGEX.test("12345678"));
});
