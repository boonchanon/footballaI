#!/usr/bin/env node

require("dotenv").config()

const mongoose = require("mongoose")

const MONGODB_URI = process.env.MONGODB_URI
const APPLY = process.argv.includes("--apply")

if (!MONGODB_URI) {
  console.error("Missing MONGODB_URI")
  process.exit(1)
}

function describeIssue(issue) {
  switch (issue) {
    case "post_published_pending":
      return "โพสต์เผยแพร่แต่ moderation ยัง pending_review"
    case "post_published_rejected":
      return "โพสต์เผยแพร่แต่ moderation เป็น rejected"
    case "story_published_pending":
      return "สตอรี่เผยแพร่แต่ moderation ยัง pending_review"
    case "story_published_rejected":
      return "สตอรี่เผยแพร่แต่ moderation เป็น rejected"
    case "comment_pending_but_approved":
      return "คอมเมนต์ pending/rejected แต่ isApproved ยังเป็น true"
    case "comment_approved_but_hidden":
      return "คอมเมนต์ approved แต่ isApproved ยังเป็น false"
    default:
      return issue
  }
}

async function auditCollection(collectionName, buildIssues, applyFix) {
  const collection = mongoose.connection.collection(collectionName)
  const docs = await collection.find({}).toArray()
  const issues = []

  for (const doc of docs) {
    const docIssues = buildIssues(doc)
    for (const issue of docIssues) {
      issues.push({
        collectionName,
        id: doc._id.toString(),
        issue,
        summary: describeIssue(issue),
      })
      if (APPLY) {
        await applyFix(collection, doc, issue)
      }
    }
  }

  return issues
}

async function main() {
  await mongoose.connect(MONGODB_URI)

  const postIssues = await auditCollection(
    "communityposts",
    (doc) => {
      const moderationStatus = doc?.moderation?.status
      const publicationStatus = doc?.status
      const issues = []

      if (publicationStatus === "published" && moderationStatus === "pending_review") {
        issues.push("post_published_pending")
      }
      if (publicationStatus === "published" && moderationStatus === "rejected") {
        issues.push("post_published_rejected")
      }

      return issues
    },
    async (collection, doc) => {
      await collection.updateOne({ _id: doc._id }, { $set: { status: "hidden" } })
    },
  )

  const storyIssues = await auditCollection(
    "communitystories",
    (doc) => {
      const moderationStatus = doc?.moderation?.status
      const publicationStatus = doc?.status
      const issues = []

      if (publicationStatus === "published" && moderationStatus === "pending_review") {
        issues.push("story_published_pending")
      }
      if (publicationStatus === "published" && moderationStatus === "rejected") {
        issues.push("story_published_rejected")
      }

      return issues
    },
    async (collection, doc) => {
      await collection.updateOne({ _id: doc._id }, { $set: { status: "hidden" } })
    },
  )

  const commentIssues = await auditCollection(
    "comments",
    (doc) => {
      const moderationStatus = doc?.moderation?.status
      const isApproved = Boolean(doc?.isApproved)
      const issues = []

      if ((moderationStatus === "pending_review" || moderationStatus === "rejected") && isApproved) {
        issues.push("comment_pending_but_approved")
      }
      if (moderationStatus === "approved" && !isApproved) {
        issues.push("comment_approved_but_hidden")
      }

      return issues
    },
    async (collection, doc, issue) => {
      if (issue === "comment_pending_but_approved") {
        await collection.updateOne({ _id: doc._id }, { $set: { isApproved: false } })
      }
      if (issue === "comment_approved_but_hidden") {
        await collection.updateOne({ _id: doc._id }, { $set: { isApproved: true } })
      }
    },
  )

  const issues = [...postIssues, ...storyIssues, ...commentIssues]
  const grouped = issues.reduce((acc, issue) => {
    acc[issue.issue] = (acc[issue.issue] || 0) + 1
    return acc
  }, {})

  console.log(
    JSON.stringify(
      {
        mode: APPLY ? "apply" : "dry-run",
        totalIssues: issues.length,
        grouped,
        samples: issues.slice(0, 20),
      },
      null,
      2,
    ),
  )

  await mongoose.disconnect()
}

main().catch(async (error) => {
  console.error(error)
  try {
    await mongoose.disconnect()
  } catch {}
  process.exit(1)
})
