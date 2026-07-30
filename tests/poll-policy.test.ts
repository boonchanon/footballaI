import test from "node:test"
import assert from "node:assert/strict"

import { canCreateOfficialPollFromMatchFacts, validateCommunityPollDraft } from "../lib/server/community-poll-policy"

test("community poll accepts 2 to 6 unique options", () => {
  assert.equal(
    validateCommunityPollDraft({
      question: "ใครคือคนที่เล่นดีที่สุด?",
      options: [
        { id: "one", text: "ผู้เล่น A" },
        { id: "two", text: "ผู้เล่น B" },
        { id: "three", text: "ผู้เล่น C" },
        { id: "four", text: "ผู้เล่น D" },
        { id: "five", text: "ผู้เล่น E" },
        { id: "six", text: "ผู้เล่น F" },
      ],
    }).ok,
    true,
  )
})

test("community poll blocks empty, duplicate, and too many options", () => {
  assert.equal(
    validateCommunityPollDraft({
      question: "ใครคือ MOM?",
      options: [
        { id: "one", text: "Arsenal" },
        { id: "two", text: "" },
      ],
    }).ok,
    false,
  )
  assert.equal(
    validateCommunityPollDraft({
      question: "ใครคือ MOM?",
      options: [
        { id: "one", text: "Arsenal" },
        { id: "two", text: "arsenal" },
      ],
    }).ok,
    false,
  )
  assert.equal(
    validateCommunityPollDraft({
      question: "ใครคือ MOM?",
      options: [
        { id: "one", text: "A" },
        { id: "two", text: "B" },
        { id: "three", text: "C" },
        { id: "four", text: "D" },
        { id: "five", text: "E" },
        { id: "six", text: "F" },
        { id: "seven", text: "G" },
      ],
    }).ok,
    false,
  )
})

test("official poll must not be created without real finished match facts", () => {
  assert.equal(canCreateOfficialPollFromMatchFacts({ isFinished: false, lineupCount: 22, eventCount: 4 }), false)
  assert.equal(canCreateOfficialPollFromMatchFacts({ isFinished: true, lineupCount: 0, eventCount: 0 }), false)
  assert.equal(canCreateOfficialPollFromMatchFacts({ isFinished: true, lineupCount: 22, eventCount: 0 }), true)
  assert.equal(canCreateOfficialPollFromMatchFacts({ isFinished: true, lineupCount: 0, eventCount: 3 }), true)
})
