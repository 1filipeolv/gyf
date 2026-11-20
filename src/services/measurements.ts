import { orderBy } from 'firebase/firestore';
import { listDocs, removeDoc, saveDoc } from './db';
import { Measurement, MeasurementSite } from '../types';

export const listMeasurements = (uid: string) =>
  listDocs<Measurement>(uid, 'measurements', orderBy('date', 'asc'));

export const saveMeasurement = (
  uid: string,
  date: string,
  values: Partial<Record<MeasurementSite, number>>,
  loggedAt?: number
) => saveDoc<Measurement>(uid, 'measurements', { id: date, date, values, ...(loggedAt ? { loggedAt } : {}) });

export const removeMeasurement = (uid: string, id: string) => removeDoc(uid, 'measurements', id);