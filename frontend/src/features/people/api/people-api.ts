/* People (debt/loan ledger) API.
   Mock-backed for now; swap each body for the commented Axios call later. */
import { db } from '@/lib/mock/db';
import { mockRequest } from '@/lib/mock/mock-request';
import type { Person, PersonEntry } from '@/types';

export function getPeople(): Promise<Person[]> {
  // return apiClient.get('/people').then((r) => r.data);
  return mockRequest(() => db.people);
}

export function getPersonHistories(): Promise<Record<string, PersonEntry[]>> {
  // return apiClient.get('/people/histories').then((r) => r.data);
  return mockRequest(() => db.personHistory);
}

export function addPerson(person: Person): Promise<Person> {
  // return apiClient.post('/people', person).then((r) => r.data);
  return mockRequest(() => {
    db.people.unshift(person);
    return person;
  });
}
