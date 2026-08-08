const test = require('node:test')
const assert = require('node:assert/strict')
const { connectDatabase, disconnectDatabase } = require('../src/config/db')

test('connects to MongoDB using MONGODB_URI', async () => {
  await connectDatabase()
  assert.ok(true)
  await disconnectDatabase()
})
