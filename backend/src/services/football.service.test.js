const test = require('node:test')
const assert = require('node:assert/strict')

const { getFixtures, getStandings, getTopScorers, getPlayerStatsSummary } = require('./football.service')

test('getFixtures returns fixture data for the matches page', async () => {
  const fixtures = await getFixtures({ type: 'all' })

  assert.ok(Array.isArray(fixtures))
  assert.ok(fixtures.length > 0)
  assert.ok(fixtures[0].teams?.home?.name)
  assert.ok(fixtures[0].teams?.away?.name)
})

test('getStandings returns ranking rows', async () => {
  const standings = await getStandings()

  assert.ok(Array.isArray(standings))
  assert.ok(standings.length > 0)
  assert.ok(standings[0].team?.name)
})

test('getTopScorers returns scorer rows', async () => {
  const scorers = await getTopScorers()

  assert.ok(Array.isArray(scorers))
  assert.ok(scorers.length > 0)
  assert.ok(scorers[0].name)
})

test('getPlayerStatsSummary returns stat groups', async () => {
  const stats = await getPlayerStatsSummary()

  assert.ok(stats && typeof stats === 'object')
  assert.ok(Array.isArray(stats.goals))
  assert.ok(stats.goals.length > 0)
})
