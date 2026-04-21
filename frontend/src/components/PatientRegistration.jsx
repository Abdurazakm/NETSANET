import { useState } from 'react';
import { AlertCircle, CheckCircle2, Shield, ShieldCheck, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';

const NAME_PATTERN = /^[a-zA-Z]+(?:[ '-][a-zA-Z]+)*$/;

function normalizeName(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function validateName(name) {
  const trimmed = normalizeName(name);

  if (!trimmed) {
    return { valid: false, error: 'Enter the patient name before continuing.' };
  }

  if (trimmed.length < 2) {
    return { valid: false, error: 'Patient name must be at least 2 characters.' };
  }

  if (trimmed.length > 50) {
    return { valid: false, error: 'Patient name must be 50 characters or fewer.' };
  }

  if (!/[a-zA-Z]/.test(trimmed)) {
    return { valid: false, error: 'Patient name must include at least one letter.' };
  }

  if (!NAME_PATTERN.test(trimmed)) {
    return {
      valid: false,
      error: 'Use letters, spaces, apostrophes, or hyphens only.',
    };
  }

  return { valid: true, error: '' };
}

function shortenAddress(value) {
  if (!value || value.length < 12) {
    return value || 'Wallet not connected';
  }

  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function getRegistrationErrorMessage(error) {
  const message = [
    error?.shortMessage,
    error?.reason,
    error?.info?.error?.message,
    error?.message,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (!message) {
    return 'Registration failed. Please try again.';
  }

  if (message.includes('already registered')) {
    return 'This wallet is already registered as a patient.';
  }

  if (message.includes('user rejected') || message.includes('action_rejected')) {
    return 'Transaction was rejected in the wallet.';
  }

  if (message.includes('insufficient funds')) {
    return 'Wallet does not have enough ETH for gas.';
  }

  if (message.includes('network')) {
    return 'Registration failed. Check network settings.';
  }

  return 'Registration failed. Check wallet and try again.';
}

export default function PatientRegistration({ contract, onRegistered, address }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [txError, setTxError] = useState('');

  const nameValidation = validateName(name);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setValidationError('');
    setTxError('');

    const normalizedName = normalizeName(name);
    const validation = validateName(normalizedName);

    if (!validation.valid) {
      setValidationError(validation.error);
      toast.error(validation.error);
      return;
    }

    if (!contract) {
      const errorMessage = 'Wallet contract connection is not ready. Reconnect and try again.';
      setTxError(errorMessage);
      toast.error(errorMessage);
      return;
    }

    try {
      setLoading(true);

      const tx = await contract.registerPatient(normalizedName);
      const confirmation = tx.wait();

      toast.promise(confirmation, {
        loading: 'Registering patient...',
        success: 'Patient registered successfully.',
        error: () => 'Registration failed.',
      });

      await confirmation;
      setName('');
      await onRegistered?.();
    } catch (error) {
      console.error('Registration failed:', error);
      const errorMessage = getRegistrationErrorMessage(error);
      setTxError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleNameChange = (event) => {
    const nextValue = event.target.value.replace(/\s{2,}/g, ' ');
    setName(nextValue);

    if (validationError) {
      const nextValidation = validateName(nextValue);
      setValidationError(nextValidation.valid ? '' : nextValidation.error);
    }
  };

  return (
    <div className="card-premium max-w-2xl">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
          <Shield className="size-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Patient Registration</h2>
          <p className="text-sm text-muted-foreground">
            Create your patient profile on chain
          </p>
        </div>
      </div>

      <div className="mt-6">
        <label className="block text-sm font-medium">Full Name</label>
        <input
          type="text"
          value={name}
          onChange={handleNameChange}
          placeholder="e.g. John Doe"
          disabled={loading}
          className="mt-2 input-premium"
        />
        <div className="mt-2">
          {name ? (
            nameValidation.valid ? (
              <span className="flex items-center gap-2 text-sm text-success">
                <CheckCircle2 className="size-4" />
                Name looks good
              </span>
            ) : (
              <span className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="size-4" />
                {nameValidation.error}
              </span>
            )
          ) : (
            <span className="text-sm text-muted-foreground">
              Enter your full display name
            </span>
          )}
        </div>
      </div>

      {(validationError || txError) && (
        <div className="mt-4 flex items-start gap-3 rounded-lg bg-destructive/5 p-4 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <p>{validationError || txError}</p>
        </div>
      )}

      <div className="mt-6 flex items-center justify-between">
        <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
          <Wallet className="size-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {shortenAddress(address)}
          </span>
        </div>

        <Button
          type="submit"
          onClick={handleSubmit}
          disabled={loading || !nameValidation.valid}
        >
          {loading ? 'Registering...' : 'Register Patient'}
        </Button>
      </div>
    </div>
  );
}