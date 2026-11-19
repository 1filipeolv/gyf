import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { CollectionName, getProfile, listDocs, saveDoc } from './db';
import { photoExists, photoUri } from './photos';
import { updateProfile } from './profile';
import { BodyWeight, Measurement, ProgressPhoto, Timestamped, UserProfile, Workout } from '../types';
import { MUSCLE_LABELS } from '../constants/muscles';
import { SITE_LABELS, SITE_LIST } from '../constants/measurements';
import { base64ToBytes, bytesToBase64 } from '../utils/base64';
import { toCsv } from '../utils/csv';
import { formatDateBR, toDateKey } from '../utils/date';

const COLLECTIONS: CollectionName[] = [
  'exercises',
  'routines',
  'workouts',
  'bodyWeights',
  'measurements',
  'progressPhotos',
  'analyses',
];

const PROFILE_FIELDS: (keyof UserProfile)[] = [
  'name',
  'sex',
  'birthDate',
  'heightCm',
  'goal',
  'experience',
  'weightUnit',
  'weeklyFrequencyTarget',
  'targetWeightKg',
  'restTimerDefaultSec',
];

type BackupData = {
  app: 'gymapp';
  version: 1;
  exportedAt: number;
  profile: Partial<UserProfile> | null;
  collections: Record<CollectionName, (Timestamped & Record<string, unknown>)[]>;
};

export type RestoreResult = Record<string, number> & { photos: number };

async function collect(uid: string): Promise<BackupData> {
  const profile = await getProfile(uid);
  const collections = {} as BackupData['collections'];
  for (const name of COLLECTIONS) {
    collections[name] = (await listDocs<Timestamped & Record<string, unknown>>(uid, name)) as never;
  }
  const clean = JSON.parse(JSON.stringify({ profile, collections }));
  return { app: 'gymapp', version: 1, exportedAt: Date.now(), ...clean };
}

async function share(uri: string, mimeType: string, title: string) {
  if (!(await Sharing.isAvailableAsync())) throw new Error('Compartilhamento indisponível neste dispositivo.');
  await Sharing.shareAsync(uri, { mimeType, dialogTitle: title });
}

async function writeText(name: string, content: string) {
  const uri = `${FileSystem.cacheDirectory}${name}`;
  await FileSystem.writeAsStringAsync(uri, content, { encoding: FileSystem.EncodingType.UTF8 });
  return uri;
}

export async function exportJson(uid: string) {
  const data = await collect(uid);
  const uri = await writeText(`gymapp-dados-${toDateKey()}.json`, JSON.stringify(data));
  await share(uri, 'application/json', 'Exportar dados');
}

export type CsvKind = 'workouts' | 'weights' | 'measurements';

export async function exportCsv(uid: string, kind: CsvKind) {
  let csv = '';
  let name = '';
  if (kind === 'workouts') {
    const list = (await listDocs<Workout>(uid, 'workouts')).sort((a, b) => a.startedAt - b.startedAt);
    const rows: unknown[][] = [];
    list.forEach((w) =>
      w.exercises.forEach((e) =>
        e.sets.forEach((s, i) =>
          rows.push([
            formatDateBR(w.date),
            w.name,
            e.exerciseName,
            MUSCLE_LABELS[e.primaryMuscle] ?? e.primaryMuscle,
            i + 1,
            s.type,
            s.reps,
            s.weightKg,
            s.rpe,
            s.type === 'warmup' ? 0 : s.reps * s.weightKg,
            !!s.isPR,
          ])
        )
      )
    );
    csv = toCsv(
      ['Data', 'Treino', 'Exercício', 'Músculo', 'Série', 'Tipo', 'Reps', 'Carga (kg)', 'RPE', 'Volume (kg)', 'PR'],
      rows
    );
    name = 'treinos';
  } else if (kind === 'weights') {
    const list = (await listDocs<BodyWeight>(uid, 'bodyWeights')).sort((a, b) => a.date.localeCompare(b.date));
    csv = toCsv(
      ['Data', 'Peso (kg)', 'Gordura (%)', 'Notas'],
      list.map((w) => [formatDateBR(w.date), w.weightKg, w.bodyFatPct, w.notes])
    );
    name = 'peso';
  } else {
    const list = (await listDocs<Measurement>(uid, 'measurements')).sort((a, b) => a.date.localeCompare(b.date));
    csv = toCsv(
      ['Data', ...SITE_LIST.map((s) => `${SITE_LABELS[s]} (cm)`), 'Notas'],
      list.map((m) => [formatDateBR(m.date), ...SITE_LIST.map((s) => m.values[s]), m.notes])
    );
    name = 'medidas';
  }
  const uri = await writeText(`gymapp-${name}-${toDateKey()}.csv`, csv);
  await share(uri, 'text/csv', 'Exportar CSV');
}

export async function exportBackupZip(uid: string): Promise<{ photos: number; missing: number }> {
  const data = await collect(uid);
  const files: Record<string, Uint8Array> = { 'data.json': strToU8(JSON.stringify(data)) };
  let photos = 0;
  let missing = 0;
  for (const p of data.collections.progressPhotos as unknown as ProgressPhoto[]) {
    if (!(await photoExists(p))) {
      missing += 1;
      continue;
    }
    const b64 = await FileSystem.readAsStringAsync(photoUri(p), { encoding: FileSystem.EncodingType.Base64 });
    files[`photos/${p.id}.jpg`] = base64ToBytes(b64);
    photos += 1;
  }
  const zipped = zipSync(files, { level: 0 });
  const uri = `${FileSystem.cacheDirectory}gymapp-backup-${toDateKey()}.zip`;
  await FileSystem.writeAsStringAsync(uri, bytesToBase64(zipped), { encoding: FileSystem.EncodingType.Base64 });
  await share(uri, 'application/zip', 'Salvar backup');
  return { photos, missing };
}

export async function restoreFrom(uid: string, fileUri: string): Promise<RestoreResult> {
  const b64 = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.Base64 });
  const bytes = base64ToBytes(b64);
  let json: string;
  let photoFiles: Record<string, Uint8Array> = {};
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) {
    const unzipped = unzipSync(bytes);
    if (!unzipped['data.json']) throw new Error('Backup inválido: data.json não encontrado.');
    json = strFromU8(unzipped['data.json']);
    photoFiles = unzipped;
  } else {
    json = strFromU8(bytes);
  }
  let data: BackupData;
  try {
    data = JSON.parse(json);
  } catch {
    throw new Error('Arquivo inválido.');
  }
  if (data.app !== 'gymapp' || data.version !== 1 || !data.collections) throw new Error('Este arquivo não é um backup do GymApp.');

  const result = { photos: 0 } as RestoreResult;

  if (data.profile) {
    const patch: Record<string, unknown> = {};
    PROFILE_FIELDS.forEach((k) => {
      if (data.profile && data.profile[k] !== undefined) patch[k] = data.profile[k];
    });
    if (Object.keys(patch).length) await updateProfile(uid, patch as Partial<UserProfile>);
  }

  for (const name of COLLECTIONS) {
    const list = data.collections[name] ?? [];
    let count = 0;
    if (name === 'progressPhotos') {
      const dir = `${FileSystem.documentDirectory}photos/`;
      const info = await FileSystem.getInfoAsync(dir);
      if (!info.exists) await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      for (const raw of list) {
        const p = raw as unknown as ProgressPhoto;
        const entry = photoFiles[`photos/${p.id}.jpg`];
        if (entry) {
          await FileSystem.writeAsStringAsync(photoUri(p), bytesToBase64(entry), {
            encoding: FileSystem.EncodingType.Base64,
          });
          result.photos += 1;
        }
        if (!(await photoExists(p))) continue;
        await saveDoc<ProgressPhoto>(uid, 'progressPhotos', { ...p, url: photoUri(p) });
        count += 1;
      }
    } else {
      for (let i = 0; i < list.length; i += 20) {
        await Promise.all(list.slice(i, i + 20).map((d) => saveDoc(uid, name, d as never)));
      }
      count = list.length;
    }
    result[name] = count;
  }
  return result;
}
