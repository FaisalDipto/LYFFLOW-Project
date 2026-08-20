import logoImg from '../assets/logo1.webp';
import titleImg from '../assets/title.webp';
import './AppLoadingScreen.css';

export default function AppLoadingScreen() {
  return (
    <main className="app-loading-screen" role="status" aria-live="polite" aria-label="Loading LYFFLOW">
      <div className="app-loading-frame">
        <div className="app-loading-brand" aria-hidden="true">
          <img className="app-loading-mark" src={logoImg} alt="" width="52" height="30" />
          <span className="app-loading-divider" />
          <img className="app-loading-wordmark" src={titleImg} alt="" width="137" height="31" />
        </div>

        <div className="app-loading-flow" aria-hidden="true">
          <span className="app-loading-line" />
          <span className="app-loading-node app-loading-node-one" />
          <span className="app-loading-node app-loading-node-two" />
          <span className="app-loading-node app-loading-node-three" />
          <span className="app-loading-node app-loading-node-four" />
          <span className="app-loading-signal" />
        </div>

        <p className="app-loading-copy">
          Preparing your workspace
          <span className="app-loading-dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </p>
      </div>
    </main>
  );
}
