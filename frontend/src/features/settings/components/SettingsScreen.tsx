import { useState } from 'react';
import { Avatar, Button, Card, CardHeading, FieldLabel, Icon, TextField } from '@/components';
import type { SavingsGoal } from '@/types';
import { formatDH } from '@/utils/format';

export interface SettingsProfile {
  name: string;
  email: string;
  initials: string;
}

export interface SettingsScreenProps {
  profile: SettingsProfile;
  savings: SavingsGoal;
  onSaveSavings: (patch: { label: string; goal: number }) => void;
  onSignOut: () => void;
}

export function SettingsScreen({ profile, savings, onSaveSavings, onSignOut }: SettingsScreenProps) {
  return (
    <div className="flex flex-col gap-3.5 lg:max-w-[640px]">
      <ProfileCard profile={profile} onSignOut={onSignOut} />
      <SavingsCard savings={savings} onSave={onSaveSavings} />
      <AboutCard />
    </div>
  );
}

function ProfileCard({ profile, onSignOut }: { profile: SettingsProfile; onSignOut: () => void }) {
  return (
    <Card className="flex flex-col gap-4">
      <CardHeading>Profile</CardHeading>
      <div className="flex items-center gap-3.5">
        <Avatar size={52}>{profile.initials}</Avatar>
        <div className="min-w-0">
          <div className="font-head text-[18px] font-bold tracking-[-0.2px]">{profile.name}</div>
          <div className="truncate text-[13.5px] font-semibold text-ink-soft">{profile.email}</div>
        </div>
      </div>
      <div className="flex items-start gap-2 rounded-[var(--radius)] border-[1.5px] border-line bg-surface-2 p-3 text-[13px] text-ink-soft">
        <Icon name="user" size={16} className="mt-0.5 flex-none" />
        <span>
          Editing your name, email, and password is coming soon.
        </span>
      </div>
      <Button variant="ghost" onClick={onSignOut} className="w-full">
        <Icon name="arrowOut" size={17} className="mr-1.5" /> Sign out
      </Button>
    </Card>
  );
}

const GITHUB_URL = 'https://github.com/Abderrahman-byte/mizan';

function AboutCard() {
  return (
    <Card className="flex flex-col gap-2.5">
      <CardHeading>About Mizan</CardHeading>
      <p className="text-[13.5px] text-ink-soft">
        Mizan (ميزان — “balance”) is an open-source personal budgeting app built by{' '}
        <b className="text-ink">Abderrahmane Elasri</b> for personal use.
      </p>
      <p className="text-[13.5px] text-ink-soft">
        Suggestions and ideas are welcome — open an issue on GitHub.
      </p>
      <a
        href={GITHUB_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1 inline-flex items-center gap-1.5 self-start text-[13.5px] font-bold text-ink underline underline-offset-2 hover:text-ink-soft"
      >
        View on GitHub <Icon name="arrowOut" size={15} />
      </a>
    </Card>
  );
}

function SavingsCard({
  savings,
  onSave,
}: {
  savings: SavingsGoal;
  onSave: (patch: { label: string; goal: number }) => void;
}) {
  const [label, setLabel] = useState(savings.label);
  const [goal, setGoal] = useState(String(savings.goal));
  const [justSaved, setJustSaved] = useState(false);

  const goalNum = Number(goal);
  const valid = label.trim().length > 0 && goalNum > 0;
  const dirty = label.trim() !== savings.label || goalNum !== savings.goal;
  const remaining = Math.max(0, goalNum - savings.saved);

  const save = () => {
    if (!valid || !dirty) return;
    onSave({ label: label.trim(), goal: Math.round(goalNum) });
    setJustSaved(true);
  };

  const onEdit = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setJustSaved(false);
  };

  return (
    <Card className="flex flex-col gap-1">
      <CardHeading>Savings goal</CardHeading>
      <p className="mb-1 mt-1.5 text-[13.5px] text-ink-soft">
        Your target and its name drive the savings progress shown on the dashboard.
      </p>

      <FieldLabel>Goal name</FieldLabel>
      <TextField
        type="text"
        value={label}
        placeholder="e.g. Emergency fund"
        onChange={(e) => onEdit(setLabel)(e.target.value)}
      />

      <FieldLabel>Target amount</FieldLabel>
      <div className="relative">
        <TextField
          type="text"
          inputMode="numeric"
          value={goal}
          placeholder="0"
          onChange={(e) => onEdit(setGoal)(e.target.value.replace(/[^\d]/g, ''))}
          onKeyDown={(e) => e.key === 'Enter' && save()}
          className="num pr-12"
        />
        <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[13px] font-extrabold text-ink-faint">
          DH
        </span>
      </div>

      <div className="mt-2.5 text-[13px] text-ink-soft">
        Saved so far <b className="num text-ink">{formatDH(savings.saved)}</b>
        {goalNum > 0 && (
          <>
            {' '}— <span className="num">{formatDH(remaining)}</span> to go
          </>
        )}
      </div>

      <div className="mt-3 flex items-center gap-3">
        <Button
          onClick={save}
          disabled={!valid || !dirty}
          className="disabled:pointer-events-none disabled:opacity-50"
        >
          <Icon name="check" size={16} /> Save changes
        </Button>
        {justSaved && !dirty && (
          <span className="flex items-center gap-1.5 text-[13px] font-bold text-good">
            <Icon name="check" size={15} /> Saved
          </span>
        )}
      </div>
    </Card>
  );
}
