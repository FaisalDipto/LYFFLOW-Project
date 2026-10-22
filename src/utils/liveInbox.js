// Applying the stream's inbox frames (inbox_message, message_update, conversation_update)
// to the thread and the conversation list held in state. Pure: each returns new arrays.

export const messageKey = (message) => message?.message_id || message?.id || null;
export const conversationKey = (row) => row?.conversation_id || row?.id || null;

const time = (value) => Date.parse(value || '') || 0;

/**
 * Inserts a message by `created_at` (oldest first, as the thread renders), or replaces
 * the copy already held. A message with files arrives twice: first with empty
 * `attachments`, then filled.
 */
export function upsertMessage(messages, incoming) {
  const key = messageKey(incoming);
  if (!key) return messages;
  const index = messages.findIndex(message => messageKey(message) === key);
  if (index >= 0) {
    const next = [...messages];
    // Keeps lazily fetched info (_isAiMsg, _agentActivityId…) on the replaced copy.
    next[index] = { ...messages[index], ...incoming, id: incoming.id || key };
    return next;
  }
  const row = { ...incoming, id: incoming.id || key };
  const at = time(row.created_at);
  let position = messages.length;
  while (position > 0 && !messages[position - 1]._pending && !messages[position - 1]._unconfirmed && time(messages[position - 1].created_at) > at) {
    position -= 1;
  }
  return [...messages.slice(0, position), row, ...messages.slice(position)];
}

/**
 * The page message a local bubble (sending, unconfirmed or awaiting its row) became:
 * same text, and a file on both or neither.
 */
export function findLocalBubble(messages, incoming) {
  if (incoming?.role !== 'page' || incoming.is_ai_msg) return null;
  const text = (incoming.message || '').trim();
  return messages.find(message => (message._pending || message._unconfirmed || message._awaitingRow)
    && (message.message || '').trim() === text
    && Boolean(message._localAttachment) === Boolean(incoming.has_attachment)) || null;
}

/** message_update: `Object.assign` the fields onto every held message it names. */
export function patchMessages(messages, messageIds, fields) {
  const ids = new Set(messageIds || []);
  if (!ids.size || !fields) return messages;
  let changed = false;
  const next = messages.map(message => {
    if (!ids.has(messageKey(message))) return message;
    changed = true;
    return { ...message, ...fields };
  });
  return changed ? next : messages;
}

/** The list row's `last_message` from a message (same four fields). */
export const previewFromMessage = (message) => ({
  message: message?.message ?? null,
  role: message?.role || 'page',
  created_at: message?.created_at || new Date().toISOString(),
  has_attachment: Boolean(message?.has_attachment),
});

/** The preview text for a list row: `last_message` is an object now, a string before. */
export function previewText(row) {
  const last = row?.last_message;
  if (last && typeof last === 'object') {
    return last.message || (last.has_attachment ? 'Attachment' : '');
  }
  return row?.snippet || (typeof last === 'string' ? last : '') || row?.messages?.data?.[0]?.message || row?.messages?.[0]?.message || '';
}

/** A new message moves its row to the top with the new preview and time. */
export function bumpConversation(rows, conversationId, message) {
  const index = rows.findIndex(row => conversationKey(row) === conversationId);
  if (index < 0) return rows;
  const row = rows[index];
  // An older frame (a second copy, or one that lost a race) leaves the row as it is.
  const current = row.last_message && typeof row.last_message === 'object' ? time(row.last_message.created_at) : 0;
  if (time(message.created_at) < current) return rows;
  const updated = { ...row, last_message: previewFromMessage(message), updated_time: message.created_at || row.updated_time };
  delete updated.snippet;
  return [updated, ...rows.slice(0, index), ...rows.slice(index + 1)];
}

/** conversation_update: patch in place; the frame says nothing about order. */
export function patchConversation(rows, conversationId, fields) {
  let changed = false;
  const next = rows.map(row => {
    if (conversationKey(row) !== conversationId) return row;
    changed = true;
    return withConversationFields(row, fields);
  });
  return changed ? next : rows;
}

// The dashboard's pause toggle reads is_paused before is_human_needed; keep them together.
export const withConversationFields = (row, fields) => ({
  ...row,
  ...fields,
  ...('is_human_needed' in (fields || {}) ? { is_paused: fields.is_human_needed } : {}),
});

/**
 * Merges a refetched first page into the list: fresh rows first, then the older rows
 * already loaded below them.
 */
export function mergeFirstPage(rows, freshRows) {
  const fresh = new Set(freshRows.map(conversationKey));
  return [...freshRows, ...rows.filter(row => !fresh.has(conversationKey(row)))];
}
