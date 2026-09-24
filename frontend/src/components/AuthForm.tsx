import { useState } from 'react';
import { useAuth } from '../context/useAuth';

export function AuthForm() {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, signup } = useAuth();

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      if (isSignup) {
        await signup(email, password);
      } else {
        await login(email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex h-full min-h-140 w-full items-center justify-center bg-canvas">
      <form onSubmit={handleSubmit} className="flex w-80 flex-col gap-3">
        <h1 className="text-center text-xl text-ink">TaskTracker</h1>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
          className="rounded-lg border border-gray-300 px-4 py-2"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
          className="rounded-lg border border-gray-300 px-4 py-2"
        />

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:opacity-50"
        >
          {isSubmitting ? 'Please wait…' : isSignup ? 'Sign up' : 'Log in'}
        </button>

        <button
          type="button"
          onClick={() => setIsSignup((prev) => !prev)}
          className="text-sm text-ink-soft underline"
        >
          {isSignup
            ? 'Already have an account? Log in'
            : "Don't have an account? Sign up"}
        </button>
      </form>
    </div>
  );
}
