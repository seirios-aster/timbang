import { useEffect, useState, type FormEvent } from 'react';
import { useAccountStore } from '@/state/accountStore';
import { Button } from '@/ui/Button';
import { Sheet } from '@/ui/Sheet';
import styles from './AccountSection.module.css';

const PRIVACY_URL = `${import.meta.env.BASE_URL}privacy.html`;

function ago(then: number | null, now: number): string {
  if (then === null) return 'Not synced yet';
  const seconds = Math.max(0, Math.round((now - then) / 1000));
  if (seconds < 45) return 'Synced just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `Synced ${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return hours < 24 ? `Synced ${hours} h ago` : 'Synced over a day ago';
}

/** Optional sign-in. Without it nothing leaves the phone. */
export function AccountSection({ heading = true }: { heading?: boolean } = {}) {
  const { ready, user, phase, message, lastSyncedAt, codeSentTo, busy, switchPending } = useAccountStore();
  const { signInWithGoogle, sendCode, verifyCode, cancelCode, syncNow, signOut, deleteAccount, resolveSwitch } =
    useAccountStore.getState();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // Keep "synced 2 min ago" honest without anything else changing.
  useEffect(() => {
    if (!user) return;
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, [user]);

  const submitEmail = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = email.trim();
    if (trimmed) void sendCode(trimmed);
  };

  const submitCode = (event: FormEvent) => {
    event.preventDefault();
    if (codeSentTo && code.trim()) void verifyCode(codeSentTo, code);
  };

  if (!ready && !user) return null;

  return (
    <div className={styles.account}>
      {heading && <p className="eyebrow">Account</p>}

      {user ? (
        <>
          <div className={styles.who}>
            <span className={styles.email}>{user.email ?? 'Signed in'}</span>
            <span className={styles.status} role="status">
              {phase === 'syncing' ? 'Syncing…' : phase === 'error' ? 'Sync paused' : ago(lastSyncedAt, now)}
            </span>
          </div>
          {message && (
            <p className={styles.problem} role="alert">
              {message}
            </p>
          )}
          <div className={styles.actions}>
            <Button variant="outline" onClick={() => void syncNow()} disabled={phase === 'syncing' || busy}>
              Sync now
            </Button>
            <Button variant="quiet" onClick={() => void signOut()} disabled={busy}>
              Sign out
            </Button>
          </div>
          <p className={styles.fine}>
            Your data is also kept on this phone, so the app works without a connection.{' '}
            <a href={PRIVACY_URL}>Privacy</a>
          </p>
          <div className={styles.actions}>
            <Button variant="quiet" className={styles.danger} onClick={() => setConfirmDelete(true)} disabled={busy}>
              Delete account
            </Button>
          </div>
        </>
      ) : codeSentTo ? (
        <form className={styles.form} onSubmit={submitCode}>
          <p className={styles.lead}>
            We sent a code to <strong>{codeSentTo}</strong>. Enter it here. On an iPhone, entering the code is more
            reliable than tapping the link.
          </p>
          <label className={styles.label} htmlFor="account-code">
            Code from the email
          </label>
          <input
            id="account-code"
            className={`${styles.input} ${styles.code}`}
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={10}
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
            autoFocus
          />
          {message && (
            <p className={styles.problem} role="alert">
              {message}
            </p>
          )}
          <div className={styles.actions}>
            <Button type="submit" disabled={busy || code.length < 6}>
              Sign in
            </Button>
            <Button
              variant="quiet"
              onClick={() => {
                setCode('');
                cancelCode();
              }}
              disabled={busy}
            >
              Use another email
            </Button>
          </div>
        </form>
      ) : (
        <>
          <p className={styles.lead}>
            Optional. Sign in to keep your data safe and use Timbang on more than one device. Without an account,
            everything stays on this phone.
          </p>
          <Button variant="outline" block onClick={() => void signInWithGoogle()} disabled={busy}>
            Continue with Google
          </Button>
          <form className={styles.form} onSubmit={submitEmail}>
            <label className={styles.label} htmlFor="account-email">
              Or get a sign-in code by email
            </label>
            <input
              id="account-email"
              className={styles.input}
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <Button type="submit" block disabled={busy || !email.trim()}>
              Email me a code
            </Button>
          </form>
          {message && (
            <p className={styles.problem} role="alert">
              {message}
            </p>
          )}
          <p className={styles.fine}>
            No password. <a href={PRIVACY_URL}>What is stored and who can see it</a>
          </p>
        </>
      )}

      <Sheet open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete account?" eyebrow="This cannot be undone">
        <div className={styles.sheetBody}>
          <p>
            This removes your account and everything saved in the cloud. The data on this phone stays, and the app keeps
            working without an account.
          </p>
          <Button
            block
            className={styles.danger}
            variant="outline"
            disabled={busy}
            onClick={() => void deleteAccount().then((done) => done && setConfirmDelete(false))}
          >
            Delete my account
          </Button>
          <Button variant="quiet" onClick={() => setConfirmDelete(false)}>
            Keep it
          </Button>
        </div>
      </Sheet>

      <Sheet
        open={switchPending !== null}
        onClose={() => void signOut()}
        title="Different account"
        eyebrow={switchPending?.email ?? undefined}
      >
        <div className={styles.sheetBody}>
          <p>
            The data on this phone belongs to another account. What should happen to it?
          </p>
          <Button block onClick={() => void resolveSwitch('replace')}>
            Use this account's data
          </Button>
          <p>Replaces what is on this phone with what is saved in {switchPending?.email ?? 'this account'}.</p>
          <Button block variant="outline" onClick={() => void resolveSwitch('add')}>
            Add this phone's data to it
          </Button>
          <p>Keeps both: this phone's data is combined with the account's.</p>
          <Button variant="quiet" onClick={() => void signOut()}>
            Cancel
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
