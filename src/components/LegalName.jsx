import { LEGAL_NAME } from '../config/company';

/**
 * The registered legal name (Bangla), marked as Bangla so screen readers pronounce it and
 * browsers shape it right, in a Bangla font that matches the surrounding text's size.
 */
export default function LegalName({ className = '' }) {
  return <span lang="bn" className={`legal-name ${className}`.trim()}>{LEGAL_NAME}</span>;
}
