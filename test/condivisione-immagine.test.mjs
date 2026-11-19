import { test } from "node:test";
import assert from "node:assert/strict";
import { condividiImmagine } from "../js/utils/interfaccia.js";

function ambiente(t, navigator) {
  const originali = ["navigator", "document"].map((nome) => [
    nome,
    Object.getOwnPropertyDescriptor(globalThis, nome),
  ]);
  const download = [];
  const toast = { classList: { toggle() {}, add() {}, remove() {} } };
  Object.defineProperty(globalThis, "navigator", { value: navigator, configurable: true });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
      getElementById: () => true,
      querySelector: () => toast,
      body: { appendChild() {} },
      createElement: () => ({
        click() {
          download.push(this.download);
        },
        remove() {},
      }),
    },
  });
  t.mock.timers.enable({ apis: ["setTimeout"] });
  t.after(() => {
    for (const [nome, descrittore] of originali) {
      if (descrittore) Object.defineProperty(globalThis, nome, descrittore);
      else delete globalThis[nome];
    }
  });
  return download;
}

test("condivide il PNG come file, senza sostituirlo con un link", async (t) => {
  const file = new File(["immagine"], "classifica.png", { type: "image/png" });
  let condiviso;
  const download = ambiente(t, {
    canShare: ({ files }) => files[0] === file,
    share: async (dati) => {
      condiviso = dati;
    },
  });
  await condividiImmagine(file, "Classifica COFTA");
  assert.deepEqual(condiviso, { files: [file], title: "Classifica COFTA" });
  assert.deepEqual(download, []);
});

test("annullare la condivisione non scarica l'immagine", async (t) => {
  const download = ambiente(t, {
    canShare: () => true,
    share: async () => {
      throw new DOMException("Annullata", "AbortError");
    },
  });
  await condividiImmagine(new File(["immagine"], "classifica.png"), "Classifica");
  assert.deepEqual(download, []);
});

for (const caso of ["senza supporto", "solo link", "file non supportati", "errore nativo"]) {
  test(`scarica il PNG quando la condivisione è ${caso}`, async (t) => {
    const navigator = {};
    if (caso !== "senza supporto") {
      navigator.share = async () => {
        throw new DOMException("Non consentita", "NotAllowedError");
      };
    }
    if (caso !== "solo link") navigator.canShare = () => caso === "errore nativo";
    const download = ambiente(t, navigator);
    const file = new File(["immagine"], "classifica.png", { type: "image/png" });
    const creaURL = t.mock.method(URL, "createObjectURL", () => "blob:classifica");
    const revocaURL = t.mock.method(URL, "revokeObjectURL");
    await condividiImmagine(file, "Classifica");
    assert.deepEqual(download, ["classifica.png"]);
    assert.equal(creaURL.mock.calls[0].arguments[0], file);
    t.mock.timers.tick(60000);
    assert.equal(revocaURL.mock.calls[0].arguments[0], "blob:classifica");
  });
}
