import { useState } from "react";

export default function PatientRegistration({ contract, onRegistered }) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!name.trim()) {
      return;
    }

    try {
      setLoading(true);
      setError("");

      const tx = await contract.registerPatient(name);
      await tx.wait();

      onRegistered(name);
    } catch (err) {
      console.error(err);
      setError(
        "Registration failed. Make sure you are on Sepolia and have test ETH.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel mt-6 px-6 py-7 sm:px-8">
      <p className="section-kicker">Patient onboarding</p>
      <h2 className="mt-3 font-display text-2xl font-bold text-slate-900 dark:text-slate-50">
        Register as a new patient
      </h2>
      <p className="panel-copy mt-3 max-w-2xl">
        Create your digital medical identity. Your real medical data will be
        encrypted and stored separately.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
            Full name
          </label>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Selam Tadesse"
            required
          />
        </div>

        {error && <p className="text-sm text-rose-500">{error}</p>}

        <button
          type="submit"
          disabled={loading || !name}
          className="btn-primary mt-2 self-start disabled:opacity-50"
        >
          {loading
            ? "Registering on Blockchain..."
            : "Create My Medical Identity"}
        </button>
      </form>
    </div>
  );
}
