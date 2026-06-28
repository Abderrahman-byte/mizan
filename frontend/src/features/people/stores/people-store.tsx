import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Person, PersonEntry } from '@/types';
import * as peopleApi from '../api/people-api';

interface PeopleContextValue {
  people: Person[];
  loading: boolean;
  error: string | null;
  addPerson: (person: Person) => void;
  /** Drill-in history for a person; synthesizes a single line when none exists. */
  historyFor: (person: Person) => PersonEntry[];
}

const PeopleContext = createContext<PeopleContextValue | null>(null);

export function PeopleProvider({ children }: { children: ReactNode }) {
  const [people, setPeople] = useState<Person[]>([]);
  const [histories, setHistories] = useState<Record<string, PersonEntry[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([peopleApi.getPeople(), peopleApi.getPersonHistories()])
      .then(([ppl, hist]) => {
        if (!active) return;
        setPeople(ppl);
        setHistories(hist);
      })
      .catch(() => active && setError('Could not load people.'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const addPerson = useCallback((person: Person) => {
    setPeople((prev) => [person, ...prev]);
    void peopleApi.addPerson(person);
  }, []);

  const historyFor = useCallback(
    (person: Person): PersonEntry[] => {
      const detailed = histories[person.name];
      if (detailed && detailed.length) return detailed;
      return [
        {
          date: 'Recent',
          label: person.note,
          amount: person.balance,
          direction: person.balance >= 0 ? 'out' : 'in',
        },
      ];
    },
    [histories],
  );

  const value = useMemo<PeopleContextValue>(
    () => ({ people, loading, error, addPerson, historyFor }),
    [people, loading, error, addPerson, historyFor],
  );

  return <PeopleContext.Provider value={value}>{children}</PeopleContext.Provider>;
}

export function usePeople(): PeopleContextValue {
  const ctx = useContext(PeopleContext);
  if (!ctx) throw new Error('usePeople must be used within a PeopleProvider');
  return ctx;
}
