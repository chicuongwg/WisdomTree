import assert from "node:assert";
import { parseSearchQuery } from "@wisdomtree/index-librarian";

export const run = async () => {
  assert.deepStrictEqual(parseSearchQuery("alpha beta"), {
    type: "and",
    left: { type: "term", value: "alpha", phrase: false },
    right: { type: "term", value: "beta", phrase: false },
  });
  assert.deepStrictEqual(parseSearchQuery('tag:history OR -"draft note"'), {
    type: "or",
    left: { type: "term", field: "tag", value: "history", phrase: false },
    right: {
      type: "not",
      child: { type: "term", value: "draft note", phrase: true },
    },
  });
  assert.deepStrictEqual(parseSearchQuery("(file:report content:river) OR property:status=done"), {
    type: "or",
    left: {
      type: "and",
      left: { type: "term", field: "file", value: "report", phrase: false },
      right: { type: "term", field: "content", value: "river", phrase: false },
    },
    right: {
      type: "term",
      field: "property",
      property: "status",
      value: "done",
      phrase: false,
    },
  });
};
