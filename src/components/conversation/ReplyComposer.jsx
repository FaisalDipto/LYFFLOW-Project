import { useEffect, useRef, useState } from 'react';
import { CornerUpLeft, FileText, Film, Image as ImageIcon, ListPlus, Loader2, Mic, Paperclip, Plus, SendHorizontal, Square, Trash2, X } from 'lucide-react';
import {
  QUICK_REPLY_LIMIT,
  QUICK_REPLY_TITLE_MAX,
  replyAttachmentAccept,
  REPLY_ATTACHMENT_RULES,
  REPLY_TEXT_MAX,
  classifyReplyAttachment,
  formatFileSize,
  quickReplyPayload,
} from '../../utils/replyAttachments';

const ATTACHMENT_ICONS = { audio: Mic, image: ImageIcon, video: Film, file: FileText };
// Recording formats in order of preference; Safari records mp4, the rest webm or ogg.
const RECORDING_TYPES = [
  ['audio/webm;codecs=opus', 'webm'],
  ['audio/webm', 'webm'],
  ['audio/mp4', 'm4a'],
  ['audio/ogg;codecs=opus', 'ogg'],
];
const MAX_RECORDING_MS = 5 * 60 * 1000;

const formatElapsed = (ms) => {
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
};

/**
 * The reply box: text, a quoted message, quick reply buttons, a file or a recorded
 * voice note. `onSendText` / `onSendFile` resolve when the reply is accepted and
 * throw (with a message to show) when it isn't; the draft comes back on failure.
 * Remount it per conversation (key) so drafts don't follow the agent around.
 * `platform` ('facebook' | 'instagram') picks the file types Meta accepts.
 */
export default function ReplyComposer({ disabled = false, disabledReason = '', platform, replyTo, onCancelReply, onSendText, onSendFile, footer }) {
  const [text, setText] = useState('');
  const [attachment, setAttachment] = useState(null); // { file, attachmentType, previewUrl }
  const [quickReplies, setQuickReplies] = useState([]);
  const [quickRepliesOpen, setQuickRepliesOpen] = useState(false);
  const [quickReplyDraft, setQuickReplyDraft] = useState('');
  const [recording, setRecording] = useState(null); // { startedAt, elapsed }
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const recorderRef = useRef(null);
  const previewUrlRef = useRef(null);

  const setAttachmentFile = (file) => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
    if (!file) {
      setAttachment(null);
      return;
    }
    const { attachmentType, error: problem } = classifyReplyAttachment(file, platform);
    if (!attachmentType) {
      setAttachment(null);
      setError(problem);
      return;
    }
    const previewUrl = ['image', 'audio', 'video'].includes(attachmentType) ? URL.createObjectURL(file) : null;
    previewUrlRef.current = previewUrl;
    setAttachment({ file, attachmentType, previewUrl });
    setError('');
  };

  // Stop the microphone and drop preview URLs when the composer goes away.
  useEffect(() => () => {
    const recorder = recorderRef.current;
    if (recorder) {
      recorder.cancelled = true;
      if (recorder.state !== 'inactive') recorder.stop();
    }
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  }, []);

  // The recording clock; stops itself at the length limit.
  useEffect(() => {
    if (!recording) return undefined;
    const timerId = setInterval(() => {
      const elapsed = Date.now() - recording.startedAt;
      if (elapsed >= MAX_RECORDING_MS) recorderRef.current?.stop();
      setRecording(current => (current ? { ...current, elapsed } : current));
    }, 250);
    return () => clearInterval(timerId);
  }, [recording?.startedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  // Grow the box with its text, up to a few lines.
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 132)}px`;
  }, [text]);

  const startRecording = async () => {
    setError('');
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError("Voice recording isn't supported in this browser. You can attach an audio file instead.");
      return;
    }
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError('Microphone access was blocked. Allow it in the browser to record a voice note.');
      return;
    }
    // Instagram takes no WebM or Ogg audio, so try M4A first there.
    const recordingTypes = platform === 'instagram'
      ? RECORDING_TYPES.filter(([, extension]) => extension === 'm4a')
      : RECORDING_TYPES;
    const [mimeType, extension] = recordingTypes.find(([type]) => MediaRecorder.isTypeSupported(type)) || [];
    if (!mimeType) {
      stream.getTracks().forEach(track => track.stop());
      setError(platform === 'instagram'
        ? "This browser can't record voice notes in a format Instagram accepts. Attach an M4A, AAC or WAV file instead."
        : "Voice recording isn't supported in this browser. You can attach an audio file instead.");
      return;
    }
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const chunks = [];
    recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
    recorder.onstop = () => {
      stream.getTracks().forEach(track => track.stop());
      recorderRef.current = null;
      setRecording(null);
      if (recorder.cancelled || chunks.length === 0) return;
      const type = (recorder.mimeType || mimeType || 'audio/webm').split(';')[0];
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
      setAttachmentFile(new File(chunks, `voice-note-${stamp}.${extension}`, { type }));
    };
    recorderRef.current = recorder;
    recorder.start();
    setAttachmentFile(null);
    setRecording({ startedAt: Date.now(), elapsed: 0 });
  };

  const stopRecording = (cancel = false) => {
    const recorder = recorderRef.current;
    if (!recorder) return;
    recorder.cancelled = cancel;
    if (recorder.state !== 'inactive') recorder.stop();
  };

  const addQuickReply = () => {
    const title = quickReplyDraft.trim();
    if (!title || quickReplies.length >= QUICK_REPLY_LIMIT) return;
    if (quickReplies.some(item => item.title.toLowerCase() === title.toLowerCase())) {
      setQuickReplyDraft('');
      return;
    }
    setQuickReplies(current => [...current, { content_type: 'text', title, payload: quickReplyPayload(title) }]);
    setQuickReplyDraft('');
  };

  const message = text.trim();
  const needsMessageForQuickReplies = !attachment && quickReplies.length > 0 && !message;
  const canSend = !disabled && !sending && !recording && (message || attachment) && !needsMessageForQuickReplies;

  const send = async () => {
    if (!canSend) return;
    const draft = { text, attachment, quickReplies };
    setSending(true);
    setError('');
    setText('');
    setAttachment(null);
    setQuickReplies([]);
    setQuickRepliesOpen(false);
    try {
      if (draft.attachment) {
        await onSendFile({ file: draft.attachment.file, attachmentType: draft.attachment.attachmentType, message: message || null });
        if (previewUrlRef.current === draft.attachment.previewUrl && previewUrlRef.current) {
          URL.revokeObjectURL(previewUrlRef.current);
          previewUrlRef.current = null;
        }
      } else {
        await onSendText({ message, quickReplies: draft.quickReplies });
      }
    } catch (sendError) {
      // Put the draft back so nothing has to be retyped or re-recorded.
      setText(current => current || draft.text);
      setAttachment(current => current || draft.attachment);
      setQuickReplies(current => (current.length ? current : draft.quickReplies));
      setError(sendError?.message || "The reply didn't go through. Try again.");
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  };

  const AttachmentIcon = attachment ? ATTACHMENT_ICONS[attachment.attachmentType] : null;
  const iconButton = 'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-200/70 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40';

  return (
    <div className="reply-composer mx-auto flex max-w-4xl flex-col gap-2">
      {replyTo && (
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <CornerUpLeft size={15} className="shrink-0 text-emerald-600" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="m-0 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-700">Replying to {replyTo.fromCustomer ? 'the customer' : 'your page'}</p>
            <p className="m-0 truncate text-xs font-medium text-slate-600">{replyTo.preview || 'Attachment'}</p>
          </div>
          <button type="button" onClick={onCancelReply} className={iconButton} aria-label="Cancel reply">
            <X size={15} />
          </button>
        </div>
      )}

      {attachment && (
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
          {attachment.attachmentType === 'image' && attachment.previewUrl ? (
            <img src={attachment.previewUrl} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" />
          ) : (
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <AttachmentIcon size={19} aria-hidden="true" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="m-0 truncate text-xs font-bold text-slate-800">{attachment.file.name}</p>
            <p className="m-0 text-[11px] font-medium text-slate-500">
              {REPLY_ATTACHMENT_RULES[attachment.attachmentType].label} · {formatFileSize(attachment.file.size)}
            </p>
            {attachment.attachmentType === 'audio' && attachment.previewUrl && (
              <audio src={attachment.previewUrl} controls className="mt-1.5 h-8 w-full max-w-xs" />
            )}
          </div>
          <button type="button" onClick={() => setAttachmentFile(null)} disabled={sending} className={iconButton} aria-label="Remove attachment">
            <Trash2 size={15} />
          </button>
        </div>
      )}

      {quickRepliesOpen && !attachment && (
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="m-0 text-[11px] font-black text-slate-700">Quick reply buttons</p>
            <span className="text-[10px] font-bold text-slate-400">{quickReplies.length}/{QUICK_REPLY_LIMIT}</span>
          </div>
          {quickReplies.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {quickReplies.map(item => (
                <span key={item.title} className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 py-1 pl-3 pr-1 text-xs font-bold text-emerald-700">
                  {item.title}
                  <button
                    type="button"
                    onClick={() => setQuickReplies(current => current.filter(other => other.title !== item.title))}
                    className="flex h-5 w-5 items-center justify-center rounded-full text-emerald-600 hover:bg-emerald-100"
                    aria-label={`Remove ${item.title}`}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              value={quickReplyDraft}
              onChange={(event) => setQuickReplyDraft(event.target.value.slice(0, QUICK_REPLY_TITLE_MAX))}
              onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addQuickReply(); } }}
              placeholder={quickReplies.length >= QUICK_REPLY_LIMIT ? 'Limit reached' : 'Button text, e.g. Track my order'}
              disabled={quickReplies.length >= QUICK_REPLY_LIMIT}
              maxLength={QUICK_REPLY_TITLE_MAX}
              className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-emerald-400 focus:bg-white"
              aria-label="Quick reply button text"
            />
            <button
              type="button"
              onClick={addQuickReply}
              disabled={!quickReplyDraft.trim() || quickReplies.length >= QUICK_REPLY_LIMIT}
              className="flex h-9 items-center gap-1 rounded-lg border border-solid border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus size={14} /> Add
            </button>
          </div>
          <p className="mb-0 mt-1.5 text-[11px] font-medium text-slate-400">The customer sees these as tappable buttons under your message (up to {QUICK_REPLY_TITLE_MAX} characters each).</p>
        </div>
      )}

      <div className={`flex items-end gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1.5 transition-all focus-within:border-emerald-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-100 ${disabled ? 'opacity-60' : ''}`}>
        {recording ? (
          <div className="flex min-h-10 flex-1 items-center gap-3 px-2" role="status">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-rose-500" aria-hidden="true" />
            <span className="text-sm font-bold tabular-nums text-slate-800">{formatElapsed(recording.elapsed)}</span>
            <span className="text-xs font-medium text-slate-500">Recording voice note</span>
            <button type="button" onClick={() => stopRecording(true)} className="ml-auto rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-200/70 hover:text-slate-800">
              Discard
            </button>
            <button type="button" onClick={() => stopRecording(false)} className="flex h-9 items-center gap-1.5 rounded-lg bg-rose-600 px-3 text-xs font-black text-white hover:bg-rose-700">
              <Square size={12} fill="currentColor" /> Stop
            </button>
          </div>
        ) : (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept={replyAttachmentAccept(platform)}
              className="hidden"
              onChange={(event) => { setAttachmentFile(event.target.files?.[0] || null); event.target.value = ''; }}
            />
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={disabled || sending} className={iconButton} aria-label="Attach a file" title="Attach an image, video, audio or document">
              <Paperclip size={18} />
            </button>
            <button type="button" onClick={startRecording} disabled={disabled || sending} className={iconButton} aria-label="Record a voice note" title="Record a voice note">
              <Mic size={18} />
            </button>
            <textarea
              ref={textareaRef}
              rows={1}
              value={text}
              maxLength={REPLY_TEXT_MAX}
              disabled={disabled}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  send();
                }
              }}
              placeholder={disabled ? (disabledReason || 'Replies are unavailable') : attachment ? 'Add a message (optional)' : 'Write a reply'}
              className="max-h-[132px] min-h-10 min-w-0 flex-1 resize-none border-none bg-transparent px-1.5 py-2 text-sm font-medium leading-6 text-slate-900 outline-none placeholder:text-slate-400 focus:ring-0 disabled:cursor-not-allowed"
              aria-label="Reply"
            />
            {!attachment && (
              <button
                type="button"
                onClick={() => setQuickRepliesOpen(open => !open)}
                disabled={disabled || sending}
                aria-pressed={quickRepliesOpen}
                className={`${iconButton} ${quickRepliesOpen || quickReplies.length ? 'bg-emerald-50 text-emerald-700' : ''}`}
                aria-label="Quick reply buttons"
                title="Add quick reply buttons"
              >
                <ListPlus size={18} />
              </button>
            )}
            <button
              type="button"
              onClick={send}
              disabled={!canSend}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              aria-label="Send reply"
            >
              {sending ? <Loader2 size={18} className="animate-spin" /> : <SendHorizontal size={18} />}
            </button>
          </>
        )}
      </div>

      {(error || needsMessageForQuickReplies || footer || text.length > REPLY_TEXT_MAX - 200) && (
        <div className="flex min-h-4 items-start justify-between gap-3 px-1">
          <div className="min-w-0">
            {error ? (
              <p className="m-0 text-[11px] font-bold text-rose-600" role="alert">{error}</p>
            ) : needsMessageForQuickReplies ? (
              <p className="m-0 text-[11px] font-semibold text-amber-700">Write a message to go with the quick reply buttons.</p>
            ) : footer}
          </div>
          {text.length > REPLY_TEXT_MAX - 200 && (
            <span className="shrink-0 text-[11px] font-bold tabular-nums text-slate-400">{text.length}/{REPLY_TEXT_MAX}</span>
          )}
        </div>
      )}
    </div>
  );
}
