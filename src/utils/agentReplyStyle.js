// An agent's owner-editable prompt parts (PATCH /v1/agent/update/{agent_id} only):
// response_format (the "# Reply Shape" section) and response_examples (customer/AI
// pairs). null restores the role's default for either.
export const RESPONSE_FORMAT_MAX = 1200;
export const REPLY_EXAMPLE_LIMITS = { maxItems: 6, customer: 200, reply: 300 };

let exampleKey = 0;
const nextKey = () => {
  exampleKey += 1;
  return `example_${exampleKey}`;
};

/** A blank example row for the editor. */
export const newReplyExample = (kind = 'text') => ({ key: nextKey(), kind, customer_message: '', agent_reply: '' });

/** Editor rows from AgentBuildResponse.response_examples (the image row carries its fixed description). */
export const examplesToRows = (examples) => (Array.isArray(examples) ? examples : []).map(example => ({
  key: nextKey(),
  kind: example.kind === 'image' ? 'image' : 'text',
  customer_message: example.customer_message || '',
  agent_reply: example.agent_reply || '',
}));

/** The request shape: text pairs send both sides; the image pair sends only the reply. */
export const rowsToExamples = (rows) => rows.map(row => (row.kind === 'image'
  ? { kind: 'image', agent_reply: row.agent_reply.trim() }
  : { kind: 'text', customer_message: row.customer_message.trim(), agent_reply: row.agent_reply.trim() }));

/** Problems per row key ({ customer?, reply? }) plus `_list` for the whole list. */
export function exampleProblems(rows) {
  const problems = {};
  rows.forEach(row => {
    const entry = {};
    if (row.kind !== 'image') {
      if (!row.customer_message.trim()) entry.customer = 'Write what the customer says.';
      else if (row.customer_message.length > REPLY_EXAMPLE_LIMITS.customer) entry.customer = `Up to ${REPLY_EXAMPLE_LIMITS.customer} characters.`;
    }
    if (!row.agent_reply.trim()) entry.reply = 'Write the reply.';
    else if (row.agent_reply.length > REPLY_EXAMPLE_LIMITS.reply) entry.reply = `Up to ${REPLY_EXAMPLE_LIMITS.reply} characters.`;
    if (entry.customer || entry.reply) problems[row.key] = entry;
  });
  if (rows.length > REPLY_EXAMPLE_LIMITS.maxItems) problems._list = `Up to ${REPLY_EXAMPLE_LIMITS.maxItems} examples.`;
  if (rows.filter(row => row.kind === 'image').length > 1) problems._list = 'Only one photo example is allowed.';
  return problems;
}

/** Same examples (ignoring editor keys and surrounding spaces)? */
export const sameExamples = (rows, examples) => JSON.stringify(rowsToExamples(rows)) === JSON.stringify(rowsToExamples(examplesToRows(examples)));
