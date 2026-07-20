// The one way an @mention is compared, shared by the server that resolves it
// and the client that highlights and suggests it.
//
// It exists because the two sides disagreeing is the whole bug class here: the
// server matched case-insensitively while the client highlighted
// case-sensitively, so a mention that resolved perfectly rendered as plain text
// and read as a broken feature. Anything that changes how a name is matched
// must change here, once.
//
// Folding is deliberately length-preserving — one input character out for one
// in. The matcher walks the folded string and slices the ORIGINAL by those
// indices, so a fold that changed the length (`normalize("NFD")` on its own
// does) would silently cut names in half.

/**
 * Lowercase, drop Vietnamese tone and vowel marks, and map đ→d, so a member
 * typing "@Pham Thu Huong" reaches Phạm Thu Hương. People type Vietnamese
 * without diacritics constantly; before this, that mention silently notified
 * nobody and said nothing about it.
 *
 * Names that collide once folded (Hương and Hường both become "huong") are not
 * a hazard: the matcher already treats an ambiguous name as "consume the span,
 * notify no one", so folding can only ever fail closed.
 */
export function foldName(input: string): string {
  let out = "";
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    // đ/Đ carry no combining mark — they are their own letters — so NFD leaves
    // them alone and they need naming.
    if (ch === "đ" || ch === "Đ") {
      out += "d";
      continue;
    }
    const decomposed = ch.normalize("NFD");
    const base = decomposed.length > 1 ? decomposed[0] : ch;
    const lower = base.toLowerCase();
    // A character whose lowercase is not one character (İ → i̇) would break the
    // index alignment the matcher depends on. Keep it as-is instead.
    out += lower.length === 1 ? lower : base;
  }
  return out;
}
