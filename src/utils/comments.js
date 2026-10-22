// Labels for the comment moderation agent's categories and routed actions.
export const COMMENT_CATEGORIES = {
  abuse_hate: { label: 'Abuse or hate', className: 'bg-rose-50 text-rose-700' },
  spam_scam: { label: 'Spam or scam', className: 'bg-rose-50 text-rose-700' },
  negative_review: { label: 'Negative review', className: 'bg-amber-50 text-amber-700' },
  competitor_promo: { label: 'Competitor promotion', className: 'bg-amber-50 text-amber-700' },
  query: { label: 'Question', className: 'bg-sky-50 text-sky-700' },
  positive_neutral: { label: 'Positive or neutral', className: 'bg-emerald-50 text-emerald-700' },
  unclear: { label: 'Unclear', className: 'bg-slate-100 text-slate-600' },
};

export const COMMENT_ACTIONS = {
  remove: 'Removed',
  reply: 'Replied',
  ignore: 'Left alone',
  review: 'Sent to you for review',
};

export const commentCategoryLabel = (category) => COMMENT_CATEGORIES[category]?.label || String(category || '').replace(/_/g, ' ');
