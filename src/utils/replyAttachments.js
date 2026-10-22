// What POST /v1/facebook/{page_id}/messenger/{conversation_id}/reply/file accepts, per
// platform and attachment type. The backend checks the same rules (and the file's magic
// bytes); these only let the composer say no before uploading. One request carries at
// most 20 MB in all.
import { isInstagram } from './platforms';

const MB = 1024 * 1024;
const REQUEST_MAX_BYTES = 20 * MB;

const MESSENGER_RULES = {
  audio: { label: 'Voice note', extensions: ['mp3', 'm4a', 'wav', 'ogg', 'webm', 'aac'], maxBytes: REQUEST_MAX_BYTES },
  image: { label: 'Image', extensions: ['jpg', 'jpeg', 'png', 'gif'], maxBytes: 8 * MB },
  video: { label: 'Video', extensions: ['mp4', 'mov'], maxBytes: REQUEST_MAX_BYTES },
  file: { label: 'Document', extensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'csv'], maxBytes: REQUEST_MAX_BYTES },
};
// Instagram: audio aac/m4a/wav (mp4 is taken as video), video mp4/ogg/avi/mov/webm, PDFs only.
const INSTAGRAM_RULES = {
  audio: { label: 'Voice note', extensions: ['aac', 'm4a', 'wav'], maxBytes: REQUEST_MAX_BYTES },
  image: { label: 'Image', extensions: ['jpg', 'jpeg', 'png', 'gif'], maxBytes: 8 * MB },
  video: { label: 'Video', extensions: ['mp4', 'ogg', 'avi', 'mov', 'webm'], maxBytes: REQUEST_MAX_BYTES },
  file: { label: 'Document', extensions: ['pdf'], maxBytes: REQUEST_MAX_BYTES },
};

/** @param {string} [platform] the page's platform: `ig` (or 'instagram'), otherwise Messenger. */
export const replyAttachmentRules = (platform) => (isInstagram(platform) ? INSTAGRAM_RULES : MESSENGER_RULES);
export const REPLY_ATTACHMENT_RULES = MESSENGER_RULES;

// For the file picker's `accept`.
export const replyAttachmentAccept = (platform) => Object.values(replyAttachmentRules(platform))
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
export function classifyReplyAttachment(file, platform) {
  const rules = replyAttachmentRules(platform);
  const extension = fileExtension(file?.name);
  const attachmentType = Object.keys(rules)
    .find(type => rules[type].extensions.includes(extension));
  if (!attachmentType) {
    const what = `${extension ? `.${extension} files` : 'This file type'} can't be sent`;
    return {
      attachmentType: null,
      error: isInstagram(platform)
        ? `${what} on Instagram. Use a JPG, PNG or GIF image, a video, an AAC, M4A or WAV voice note, or a PDF.`
        : `${what}. Use a JPG, PNG or GIF image, a video, a voice note, or a PDF, Word, Excel, CSV or text file.`,
    };
  }
  const rule = rules[attachmentType];
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
