// What POST /v1/facebook/{page_id}/messenger/{conversation_id}/reply/file accepts, per
// attachment type. The backend checks the same rules (and the file's magic bytes); these
// only let the composer say no before uploading.
const MB = 1024 * 1024;

export const REPLY_ATTACHMENT_RULES = {
  audio: { label: 'Voice note', extensions: ['mp3', 'm4a', 'wav', 'ogg', 'webm', 'aac'], maxBytes: 25 * MB },
  image: { label: 'Image', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'], maxBytes: 8 * MB },
  video: { label: 'Video', extensions: ['mp4', 'mov'], maxBytes: 25 * MB },
  file: { label: 'Document', extensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'csv'], maxBytes: 25 * MB },
};

// For the file picker's `accept`.
export const REPLY_ATTACHMENT_ACCEPT = Object.values(REPLY_ATTACHMENT_RULES)
  .flatMap(rule => rule.extensions.map(extension => `.${extension}`))
  .join(',');

export const fileExtension = (name = '') => {
  const match = /\.([^.]+)$/.exec(name);
  return match ? match[1].toLowerCase() : '';
};

export const formatFileSize = (bytes) => {
  if (!Number.isFinite(bytes)) return '';
  if (bytes >= MB) return `${(bytes / MB).toFixed(bytes >= 10 * MB ? 0 : 1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

/**
 * Works out how a picked or recorded file is sent, or why it can't be.
 * @returns {{ attachmentType: 'audio'|'image'|'video'|'file', error: '' } | { attachmentType: null, error: string }}
 */
export function classifyReplyAttachment(file) {
  const extension = fileExtension(file?.name);
  const attachmentType = Object.keys(REPLY_ATTACHMENT_RULES)
    .find(type => REPLY_ATTACHMENT_RULES[type].extensions.includes(extension));
  if (!attachmentType) {
    return { attachmentType: null, error: `${extension ? `.${extension} files` : 'This file type'} can't be sent. Use an image, video, voice note, PDF, Word, Excel, CSV or text file.` };
  }
  const rule = REPLY_ATTACHMENT_RULES[attachmentType];
  if (file.size > rule.maxBytes) {
    return { attachmentType: null, error: `${rule.label}s can be up to ${formatFileSize(rule.maxBytes)}; this one is ${formatFileSize(file.size)}.` };
  }
  return { attachmentType, error: '' };
}

// Quick reply buttons: Meta allows 13 per message, titles up to 20 characters.
export const QUICK_REPLY_LIMIT = 13;
export const QUICK_REPLY_TITLE_MAX = 20;
export const REPLY_TEXT_MAX = 2000;

// The payload returned in the webhook when the customer taps the button.
export const quickReplyPayload = (title) =>
  title.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 1000) || 'QUICK_REPLY';
