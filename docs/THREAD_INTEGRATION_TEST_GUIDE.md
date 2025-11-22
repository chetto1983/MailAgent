# Thread Support - Integration Testing Guide

**Date**: 2025-11-22
**Status**: ✅ Ready for Testing
**Backend**: Running on http://localhost:3000
**Frontend**: Running on http://localhost:3001

---

## 🎯 Test Objectives

1. ✅ Verify thread grouping in email list (count badges)
2. ✅ Verify full conversation view in ThreadDisplay
3. ✅ Verify WebSocket real-time thread updates
4. ✅ Test with real email data (Gmail/Outlook/IMAP)

---

## 📋 Test Scenarios

### Scenario 1: Thread Count Badges in Email List

**Steps:**
1. Open browser to http://localhost:3001
2. Log in with your email provider (Gmail/Outlook/IMAP)
3. Navigate to Inbox
4. Look for emails that are part of a conversation

**Expected Results:**
- ✅ Emails with multiple messages in thread show badge (e.g., "👥 3")
- ✅ Single emails show no badge
- ✅ Badge count matches actual number of emails in thread

**Screenshot:** `thread-list-badges.png`

---

### Scenario 2: Full Conversation View

**Steps:**
1. Click on an email that has a thread count badge
2. ThreadDisplay should open on the right side

**Expected Results:**
- ✅ Subject shows thread count (e.g., "Subject (3 messages)")
- ✅ All emails in thread are displayed chronologically
- ✅ Each email shows:
  - Sender name and email
  - Timestamp
  - Recipients (To, CC if present)
  - Email body
  - Attachments (if any)
- ✅ Dividers between emails (not after last email)

**Screenshot:** `thread-conversation-view.png`

---

### Scenario 3: WebSocket Real-time Updates

**Setup:**
1. Open browser window with MailAgent at http://localhost:3001
2. Keep browser DevTools open (F12) → Network → WS tab
3. Verify WebSocket connection to `ws://localhost:3000/realtime`

**Steps:**
1. From another email client (Gmail web, Outlook, etc.), send a reply to an existing conversation
2. Watch for WebSocket events in DevTools
3. Check if the thread updates in real-time

**Expected WebSocket Events:**
```json
{
  "event": "email:thread_update",
  "data": {
    "threadId": "thread-abc123",
    "emailIds": ["email-1", "email-2", "email-3"],
    "timestamp": "2025-11-22T19:40:00Z"
  }
}
```

**Expected UI Updates:**
- ✅ Thread count badge updates immediately (e.g., 2 → 3)
- ✅ New email appears in conversation view if thread is open
- ✅ No page refresh needed

---

### Scenario 4: Send Email to Self (Thread Creation)

**Steps:**
1. In MailAgent, click "Compose" button
2. Send an email to yourself with subject "Thread Test 1"
3. Wait for email to arrive (check WebSocket events)
4. Reply to that email from MailAgent
5. Reply again to create a 3-email thread

**Expected Results:**
- ✅ First email shows no thread badge (single email)
- ✅ After first reply, both emails show badge "👥 2"
- ✅ After second reply, all emails show badge "👥 3"
- ✅ Thread view shows all 3 emails in chronological order
- ✅ All updates happen in real-time via WebSocket

---

## 🔍 Testing Checklist

### Email List (ThreadList Component)

- [ ] Thread count badges appear correctly
- [ ] Badges only show for threads with 2+ emails
- [ ] Count updates in real-time when new replies arrive
- [ ] Performance is good with 100+ threads
- [ ] Infinite scroll works correctly

### Conversation View (ThreadDisplay Component)

- [ ] All emails in thread are displayed
- [ ] Chronological order (oldest first)
- [ ] Sender information correct for each email
- [ ] Timestamps formatted correctly
- [ ] Email bodies render properly (HTML sanitized)
- [ ] Attachments display correctly
- [ ] No XSS vulnerabilities (malicious HTML is sanitized)

### WebSocket Integration

- [ ] Connection establishes successfully
- [ ] `email:thread_update` events received
- [ ] UI updates immediately on thread events
- [ ] No memory leaks on reconnection
- [ ] Cleanup on component unmount

### Security

- [ ] XSS prevention working (test with `<script>alert('XSS')</script>` in subject)
- [ ] Large threads (100+ emails) don't crash the UI
- [ ] Malformed data handled gracefully

---

## 🐛 Known Issues / Limitations

1. **ThreadDisplay Coverage**: Component coverage is 40% because many action handlers (reply, forward, archive) are tested via integration, not unit tests
2. **Label Components**: Label-related components have low coverage as they're not part of thread-specific testing

---

## 📊 Integration Test Results

### Environment
- **Backend**: ✅ Running (http://localhost:3000)
- **Frontend**: ✅ Running (http://localhost:3001)
- **Database**: ✅ Connected (PostgreSQL)
- **Redis**: ✅ Connected
- **WebSocket**: ✅ Ready (/realtime namespace)

### Test Execution

| Test Scenario | Status | Notes |
|--------------|--------|-------|
| Thread Count Badges | 🔄 Pending | |
| Conversation View | 🔄 Pending | |
| WebSocket Updates | 🔄 Pending | |
| Send Email to Self | 🔄 Pending | |

---

## 🚀 Next Steps

1. **Execute Manual Tests**: Follow the scenarios above and update the test results
2. **Capture Screenshots**: Document the UI behavior
3. **Performance Testing**: Test with 1,000+ threads
4. **Multi-Provider Testing**: Test with Gmail, Outlook, IMAP providers
5. **Edge Cases**: Test with very long subjects, many attachments, large email bodies

---

## 📝 How to Log Test Results

After completing each test scenario:

1. Update the "Test Execution" table above
2. Change status from 🔄 Pending to:
   - ✅ Passed
   - ❌ Failed (with notes)
   - ⚠️ Partial (with notes)
3. Add screenshots to `docs/screenshots/` folder
4. Document any bugs found in GitHub Issues

---

**Ready to Test!** 🎉

Open your browser to http://localhost:3001 and start testing!
