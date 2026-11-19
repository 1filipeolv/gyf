import { listRecent, removeDoc, saveDoc } from './db';
import { Analysis, NewDoc } from '../types';

export const listAnalyses = (uid: string, max = 20) => listRecent<Analysis>(uid, 'analyses', max);

export const saveAnalysis = (uid: string, a: NewDoc<Analysis>) =>
  saveDoc<Analysis>(uid, 'analyses', JSON.parse(JSON.stringify(a)));

export const removeAnalysis = (uid: string, id: string) => removeDoc(uid, 'analyses', id);