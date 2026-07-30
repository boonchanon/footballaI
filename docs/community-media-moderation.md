# Community Media Moderation

## What the current pipeline checks

### Images
- OpenAI image moderation for sexual content, sexual/minors, violence, and graphic violence.
- Vision text extraction on the image when `IMAGE_TEXT_EXTRACTION_ENABLED` is on and an OpenAI key is available.
- Reuse of the existing text moderation logic on extracted text, visible URLs, QR destinations, and contact hints.
- Blocked gambling domain detection through the shared domain logic.
- Gambling promotion + contact escalation to `rejected`.

### Stories
- Caption moderation through the existing text moderation pipeline.
- Image moderation through the same image pipeline above.
- Aggregated result:
  - any `rejected` part => story `rejected`
  - any `pending_review` part => story `pending_review`
  - all safe => story `approved`

### Videos
- Upload validation is implemented.
- Videos are currently stored as `processing` and marked as moderation foundation only.
- Full frame OCR / transcript / QR moderation is not complete yet.

## Current limitations
- OCR / vision extraction may miss Thai text or stylized logos.
- Gambling logos without readable text may still be missed.
- QR detection depends on the vision provider recognizing or decoding the QR content.
- Video moderation is not full content moderation yet; it is still a processing foundation.
- Technical errors from OCR / provider failures are not treated as user violations and should not create strikes.

## User-facing outcomes
- Unsafe image: reject with a community-safe message.
- Ambiguous or risky image: send to pending review and keep it out of public display.
- Safe image with OCR unavailable: do not auto-reject just because OCR failed.
