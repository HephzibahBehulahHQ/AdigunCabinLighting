
import { useEffect, useState, type FormEvent } from 'react';

type Mode = 'sign-in' | 'register' | 'reset-password';
type Guest = 'checking' | 'active' | 'expired' | 'unavailable';
type Reply = { step: string; error?: string; remainingMs?: number };
let guestRequest: Promise<Reply> | undefined;

async function request(body: object): Promise<Reply> {
  const response = await fetch('/api/account', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  const result = await response.json().catch(() => null) as Reply | null;
  if (!response.ok || !result) {
    const messages: Record<string, string> = {
      'invalid-product-credentials': 'That email and password did not match a CabinLighting account.',
      'invalid-or-expired-email-code': 'That email code is incorrect or expired.',
      'email-code-request-required': 'Request a fresh code in this tab.',
      'product-account-not-authorized': 'Could not complete this request. If you already have an account, sign in or reset your password.',
      'wait-and-retry': 'Wait before requesting another code.',
    };
    throw new Error(messages[result?.error ?? ''] ?? 'CabinLighting account service is unavailable.');
  }
  return result;
}

function requestGuest() {
  guestRequest ??= request({ step: 'guest', allowStart: true }).finally(() => { guestRequest = undefined; });
  return guestRequest;
}

export function useStudioAccess() {
  const [guest, setGuest] = useState<Guest>('checking');
  const [signedIn, setSignedIn] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    let timer: number | undefined;
    void requestGuest().then(({ step, remainingMs }) => {
      if (!active) return;
      if (step !== 'guest' || typeof remainingMs !== 'number' || !Number.isInteger(remainingMs) || remainingMs < 0 || remainingMs > 240000) {
        throw new Error('Invalid guest deadline');
      }
      setGuest(remainingMs > 0 ? 'active' : 'expired');
      if (remainingMs > 0) timer = window.setTimeout(() => setGuest('expired'), remainingMs);
    }).catch(() => { if (active) setGuest('unavailable'); });
    return () => { active = false; window.clearTimeout(timer); };
  }, [retry]);
  useEffect(() => {
    if (!signedIn) return;
    const timer = window.setTimeout(() => setSignedIn(false), 12 * 60 * 60 * 1000);
    return () => window.clearTimeout(timer);
  }, [signedIn]);
  return {
    guest, signedIn, setSignedIn, locked: !signedIn && guest !== 'active',
    retryGuest: () => { setGuest('checking'); setRetry((count) => count + 1); },
  };
}

export function CabinAccount({
  access, close,
}: { access: ReturnType<typeof useStudioAccess>; close: () => void }) {
  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [waiting, setWaiting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      if (!waiting) {
        const clicked = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
        const action = clicked?.value === 'register' ? 'register' : mode;
        const result = await request({ step: 'begin', mode: action, email, password });
        if (result.step !== 'verify') throw new Error('Could not request an email code.');
        setWaiting(true);
        setMessage('Enter the code sent to your email.');
        return;
      }
      const result = await request({ step: 'verify', code });
      if (result.step === 'signed-in') {
        access.setSignedIn(true);
        close();
      } else if (result.step === 'registered') {
        setMessage('Account verified. Sign in with your CabinLighting password and a fresh email code.');
      } else if (result.step === 'password-reset') {
        setMessage('Password reset. Sign in with your new password.');
      } else throw new Error('Could not verify the email code.');
      setWaiting(false);
      setMode('sign-in');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not complete the account request.');
    } finally {
      setCode('');
      setPassword('');
      setBusy(false);
    }
  }

  return <div className="cabin-account-backdrop">
    <section className="cabin-account" role="dialog" aria-modal="true" aria-labelledby="cabin-account-heading">
      <h2 id="cabin-account-heading">CabinLighting account</h2>
      <p>{access.locked ? access.guest === 'expired' ? 'Your four-minute Studio trial has ended.' : access.guest === 'unavailable' ? 'Could not verify guest access.' : 'Checking Studio access…' : 'Use your CabinLighting password and an email code to sign in.'}</p>
      {access.guest === 'unavailable' && <button className="button button-outline" onClick={access.retryGuest}>Retry Studio access</button>}
      {access.signedIn ? <button className="button button-outline" onClick={() => { access.setSignedIn(false); close(); }}>Sign out</button> :
        <form onSubmit={(event) => void submit(event)}>
          {waiting ? <label>Email code<input required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,10}" maxLength={10} value={code} onChange={(event) => setCode(event.target.value)} /></label> : <>
            <label>Email<input required type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
            <label>{mode === 'reset-password' ? 'New password' : 'Password'}<input required type="password" minLength={12} maxLength={256} autoComplete={mode === 'reset-password' ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          </>}
          <div className="cabin-account-actions">
            <button className="button button-primary" type="submit" disabled={busy}>{waiting ? 'Verify code' : mode === 'reset-password' ? 'Send reset code' : 'Sign in'}</button>
            {!waiting && mode === 'sign-in' && <button className="button button-outline" type="submit" value="register" disabled={busy}>Create account</button>}
            <button className="button button-outline" type="button" disabled={busy} onClick={() => {
              setMode(waiting || mode === 'reset-password' ? 'sign-in' : 'reset-password');
              setWaiting(false);
              setMessage('');
              setCode('');
              setPassword('');
            }}>{waiting ? 'Start again' : mode === 'reset-password' ? 'Back to sign in' : 'Forgot password?'}</button>
          </div>
        </form>}
      {message && <p role="status">{message}</p>}
      <div className="cabin-account-actions">
        {!access.locked && <button className="button button-quiet" onClick={close}>Close</button>}
        <a className="button button-quiet" href="/">Back to product page</a>
      </div>
    </section>
  </div>;
}
