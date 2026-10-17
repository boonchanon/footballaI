const test = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const os = require("node:os")
const path = require("node:path")
const ts = require("typescript")

const out = fs.mkdtempSync(path.join(os.tmpdir(), "footballai-quiz-unit-"))
for (const file of ["lib/games/quiz", "lib/server/quiz-engine", "lib/server/quiz-bank", "lib/server/quiz-round", "lib/season", "lib/server/quiz-period", "lib/games/who-am-i", "lib/server/who-am-i-bank", "lib/server/who-am-i-engine", "lib/server/who-am-i-round"]) {
  const destination = path.join(out, file + ".js")
  fs.mkdirSync(path.dirname(destination), { recursive: true })
  fs.writeFileSync(destination, ts.transpileModule(fs.readFileSync(path.join(__dirname, "..", file + ".ts"), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText)
}
const { answerQuiz, nextQuizQuestion, quizView } = require(path.join(out, "lib/server/quiz-engine.js"))
const { quizBank } = require(path.join(out, "lib/server/quiz-bank.js"))
const { buildQuizRound } = require(path.join(out, "lib/server/quiz-round.js"))
const { quizPeriodRange } = require(path.join(out, "lib/server/quiz-period.js"))
const { PREMIER_LEAGUE_DATA_SEASON } = require(path.join(out, "lib/season.js"))
const { transitionWho, whoDeadline, whoView } = require(path.join(out, "lib/server/who-am-i-engine.js"))
const { allChallenges } = require(path.join(out, "lib/server/who-am-i-bank.js"))
const { buildWhoRound } = require(path.join(out, "lib/server/who-am-i-round.js"))
test.after(() => fs.rmSync(out, { recursive: true, force: true }))

function whoRound(difficulty = "easy") {
  return { difficulty, status: "playing", questions: allChallenges.slice(0, 6), currentIndex: 0, questionStartedAt: 1000,
    revealedClues: 1, answers: [], score: 0, correctCount: 0, completedAt: null }
}
test("Who Am I bank has twenty six-clue challenges without exposing locked data", () => {
  assert.equal(allChallenges.length, 20)
  assert.equal(new Set(allChallenges.map(q => q.id)).size, 20)
  for (const question of allChallenges) assert.match(question.id, /^\d+$/, "Question IDs must not disclose player names")
  for (const question of allChallenges) { assert.equal(question.clues.length, 6); assert.ok(question.options.includes(question.answer)) }
  const view = whoView("id", whoRound(), 1001)
  assert.equal("answer" in view.currentQuestion, false)
  assert.equal("questions" in view, false)
  assert.deepEqual(view.currentQuestion.clues.slice(1), [null, null, null, null, null])
  assert.equal(view.currentQuestion.mode, "clues")
  for (const question of allChallenges.filter(q => q.mode)) {
    assert.equal(question.clueLabels.length, 6)
    assert.ok(question.sources.length > 0)
    const state = { ...whoRound(), questions: [question] }
    const shown = whoView("id", state, 1001).currentQuestion
    assert.equal(shown.mode, question.mode)
    assert.deepEqual(shown.clueLabels.slice(1), [null,null,null,null,null])
    assert.equal("sources" in shown, false)
    assert.equal("answer" in shown, false)
  }
})
test("mixed rounds contain two of each mode, six distinct players and alternate modes", () => {
  for (let offset = 0; offset < 40; offset++) {
    const rotate = items => { const k = offset % items.length; return [...items.slice(k), ...items.slice(0,k)] }
    const round = buildWhoRound(rotate)
    assert.equal(round.length, 6)
    assert.equal(new Set(round.map(q => q.answer)).size, 6)
    for (const mode of ["clues","career","stats"]) assert.equal(round.filter(q => (q.mode || "clues") === mode).length, 2)
    for (let i = 1; i < round.length; i++) assert.notEqual(round[i].mode || "clues", round[i-1].mode || "clues")
    const replay = buildWhoRound(rotate, round.map(q => q.id))
    assert.ok(replay.some(q => !round.some(old => old.id === q.id)))
  }
})
test("Who Am I difficulty changes only the global 7/5/3 minute deadline", () => {
  for (const [difficulty, seconds] of [["easy",420],["medium",300],["hard",180]]) {
    let state = whoRound(difficulty)
    assert.equal(whoDeadline(state), 1000 + seconds * 1000)
    state = transitionWho(state, "answer", state.questions[0].id, state.questions[0].answer, null, 2000)
    assert.equal(state.score, 40)
    state = transitionWho(state, "next", state.questions[0].id, null, null, 3000)
    assert.equal(whoDeadline(state), 1000 + seconds * 1000)
  }
})
test("Who Am I hints are sequential and idempotent and determine all score tiers", () => {
  for (let count = 1; count <= 6; count++) {
    let state = whoRound()
    assert.throws(() => transitionWho(state,"hint","1",null,3,2000))
    for (let hint = 2; hint <= count; hint++) {
      state = transitionWho(state,"hint","1",null,hint,2000)
      assert.equal(transitionWho(state,"hint","1",null,hint,2000),state)
    }
    state = transitionWho(state,"answer","1",state.questions[0].answer,null,2000)
    assert.equal(state.score, 10 + (7 - count) * 5)
    assert.equal(state.answers[0].hints,count)
    assert.equal(whoView("id",state,2000).currentQuestion.answer,state.questions[0].answer)
    assert.equal(transitionWho(state,"answer","1",state.questions[0].options[1],null,2001),state)
  }
})
test("Who Am I rejects early completion and invalid/future answers; timeout awards no extra points", () => {
  const state = whoRound("hard")
  assert.throws(() => transitionWho(state,"complete",null,null,null,1001))
  assert.throws(() => transitionWho(state,"answer","2",state.questions[1].answer,null,1001))
  assert.throws(() => transitionWho(state,"answer","1","invalid",null,1001))
  const expired = transitionWho(state,"answer","1",state.questions[0].answer,null,whoDeadline(state))
  assert.equal(expired.status,"completed")
  assert.equal(expired.score,0)
  assert.equal(expired.answers.length,0)
  assert.equal(whoView("id",expired,999999).timedOut,true)
  assert.equal(transitionWho(expired,"complete",null,null,null,999999),expired)
})
test("Who Am I commits six answers once and freezes completion time", () => {
  let state = whoRound()
  for (const q of state.questions) {
    state = transitionWho(state,"answer",q.id,q.answer,null,2000)
    if(state.status !== "completed") state = transitionWho(state,"next",q.id,null,null,2001)
  }
  assert.equal(state.score,240)
  assert.equal(state.correctCount,6)
  assert.equal(state.status,"completed")
  assert.equal(whoView("id",state,999999).timedOut,false)
  assert.equal(whoView("id",state,999999).serverNow,2000)
})

test("Thai calendar weeks start Monday and cross year boundaries", () => {
  const range = quizPeriodRange("weekly", new Date("2026-01-04T17:00:00Z"))
  assert.equal(range.start.toISOString(), "2026-01-04T17:00:00.000Z")
  assert.equal(range.end.toISOString(), "2026-01-11T17:00:00.000Z")
  assert.equal(quizPeriodRange("weekly", new Date("2026-01-04T16:59:59Z")).start.toISOString(), "2025-12-28T17:00:00.000Z")
})
test("Thai month boundaries and configured season use half-open intervals", () => {
  const month = quizPeriodRange("monthly", new Date("2025-12-31T17:00:00Z"))
  assert.equal(month.start.toISOString(), "2025-12-31T17:00:00.000Z")
  assert.equal(month.end.toISOString(), "2026-01-31T17:00:00.000Z")
  const season = quizPeriodRange("season")
  assert.equal(season.start.getTime(), new Date(PREMIER_LEAGUE_DATA_SEASON.startDate + "T00:00:00+07:00").getTime())
  assert.equal(season.end.getTime(), new Date(PREMIER_LEAGUE_DATA_SEASON.endDate + "T00:00:00+07:00").getTime())
})

function round() {
  return {
    category: "test", status: "playing", questions: [
      { id: "a", question: "A", options: ["0", "1", "2", "3"], answer: 2 },
      { id: "b", question: "B", options: ["0", "1", "2", "3"], answer: 1 },
    ],
    currentIndex: 0, questionStartedAt: 100000, answers: [], score: 0,
    correctCount: 0, streak: 0, bestStreak: 0, completedAt: null,
  }
}

test("six category banks have valid unique IDs, questions and answer options", () => {
  assert.deepEqual(Object.values(quizBank).map(q => q.length), [20, 15, 25, 15, 12, 18])
  const questions = Object.values(quizBank).flat()
  assert.equal(new Set(questions.map(q => q.id)).size, 105)
  assert.equal(new Set(questions.map(q => q.question)).size, 105)
  for (const q of questions) assert.equal(new Set(q.options).size, 4)
  for (const q of questions) assert.ok(Number.isInteger(q.answer) && q.options[q.answer])
})
test("fresh rounds have six distinct questions, avoid recent rounds and remap shuffled answers", () => {
  const shuffle = items => [...items].reverse()
  for (const category of [...Object.keys(quizBank), "mixed"]) {
    const first = buildQuizRound(category, shuffle)
    const next = buildQuizRound(category, shuffle, [first.map(q => q.id)])
    assert.equal(first.length, 6)
    assert.equal(new Set(first.map(q => q.id)).size, 6)
    assert(next.every(q => !first.some(previous => previous.id === q.id)))
    for (const q of [...first, ...next]) {
      const original = Object.values(quizBank).flat().find(row => row.id === q.id)
      assert.equal(q.options[q.answer], original.options[original.answer])
      assert.notDeepEqual(q.options, original.options)
    }
  }
})
test("after exhausting a bank, the least recently used questions return first", () => {
  const shuffle = items => [...items]
  const a = buildQuizRound("football-rules", shuffle)
  const b = buildQuizRound("football-rules", shuffle, [a.map(q => q.id)])
  const c = buildQuizRound("football-rules", shuffle, [b.map(q => q.id), a.map(q => q.id)])
  assert.deepEqual(c.map(q => q.id), a.map(q => q.id))
})
test("difficulty deadlines are authoritative and legacy sessions retain 15 seconds", () => {
  for (const [difficulty, seconds] of [["easy",30],["medium",20],["hard",15]]) {
    const state = { ...round(), difficulty }
    assert.equal(quizView("id", state, 100000).secondsPerQuestion, seconds)
    assert.equal(quizView("id", state, 100000).deadline, 100000 + seconds * 1000)
    assert.equal(answerQuiz(state, "a", 2, 100000 + seconds * 1000).score, 0)
    assert.equal(answerQuiz(state, "a", 2, 100001).score, 15)
  }
  assert.equal(quizView("id", round(), 100000).deadline, 115000)
})
test("does not expose answer keys, other questions, or document internals", () => {
  const view = quizView("session", round(), 100000)
  assert.equal("answer" in view.currentQuestion, false)
  assert.equal("questions" in view, false)
  assert.equal("user" in view, false)
  assert.deepEqual(view.answers, [])
})
test("server elapsed time controls every speed-bonus boundary", () => {
  for (const [elapsed, points] of [[0,15],[5999,15],[6000,13],[10999,13],[11000,11],[14999,11],[15000,0],[90000,0]]) {
    assert.equal(answerQuiz(round(), "a", 2, 100000 + elapsed).score, points)
  }
})
test("wrong answers and timeouts award zero; early timeout is rejected", () => {
  assert.equal(answerQuiz(round(), "a", 0, 100001).score, 0)
  assert.throws(() => answerQuiz(round(), "a", null, 100001))
  const timedOut = answerQuiz(round(), "a", 2, 115000)
  assert.equal(timedOut.answers[0].selected, null)
  assert.equal(timedOut.answers[0].correct, false)
})
test("rejects invalid selections and attempts to answer ahead", () => {
  for (const selected of [-1,4,1.5,"2",undefined,{},Infinity]) {
    assert.throws(() => answerQuiz(round(), "a", selected, 100001))
  }
  assert.throws(() => answerQuiz(round(), "b", 1, 100001))
  assert.throws(() => nextQuizQuestion(round(), "a", 100001))
})
test("answer and next retries are idempotent and cannot restart a deadline", () => {
  const answered = answerQuiz(round(), "a", 0, 100001)
  assert.equal(answerQuiz(answered, "a", 2, 100002), answered)
  const next = nextQuizQuestion(answered, "a", 110000)
  assert.equal(next.questionStartedAt, 110000)
  assert.equal(nextQuizQuestion(next, "a", 120000), next)
  assert.equal("answer" in quizView("session", next, 110000).currentQuestion, false)
})
test("last answer completes the round once, retaining authoritative totals", () => {
  let state = answerQuiz(round(), "a", 2, 100001)
  assert.equal(quizView("session", state, 100002).currentQuestion.answer, 2)
  state = nextQuizQuestion(state, "a", 110000)
  state = answerQuiz(state, "b", 1, 116000)
  assert.equal(state.status, "completed")
  assert.equal(state.score, 28)
  assert.equal(state.correctCount, 2)
  assert.equal(state.bestStreak, 2)
  assert.equal(state.answers.length, 2)
  assert.equal(answerQuiz(state, "b", 0, 130000), state)
  assert.equal(nextQuizQuestion(state, "b", 140000), state)
  assert.equal(state.completedAt.getTime(), 116000)
})
