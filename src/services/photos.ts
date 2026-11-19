import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import { orderBy } from 'firebase/firestore';
import { listDocs, removeDoc, saveDoc } from './db';
import { PhotoAngle, ProgressPhoto } from '../types';
import { uid as rid } from '../utils/workout';

const DIR = `${FileSystem.documentDirectory}photos/`;

async function ensureDir() {
  const info = await FileSystem.getInfoAsync(DIR);
  if (!info.exists) await FileSystem.makeDirectoryAsync(DIR, { intermediates: true });
}

export const listPhotos = (uid: string) =>
  listDocs<ProgressPhoto>(uid, 'progressPhotos', orderBy('date', 'asc'));

export async function savePhoto(
  uid: string,
  sourceUri: string,
  date: string,
  angle: PhotoAngle,
  weightKg?: number,
  notes?: string
) {
  await ensureDir();
  const out = await ImageManipulator.manipulateAsync(
    sourceUri,
    [{ resize: { width: 1080 } }],
    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
  );
  const id = rid();
  const dest = `${DIR}${id}.jpg`;
  await FileSystem.copyAsync({ from: out.uri, to: dest });
  return saveDoc<ProgressPhoto>(uid, 'progressPhotos', {
    id,
    date,
    angle,
    storagePath: `photos/${id}.jpg`,
    url: dest,
    ...(weightKg ? { weightKg } : {}),
    ...(notes ? { notes } : {}),
  });
}

export async function removePhoto(uid: string, p: ProgressPhoto) {
  await FileSystem.deleteAsync(`${DIR}${p.id}.jpg`, { idempotent: true });
  await removeDoc(uid, 'progressPhotos', p.id);
}

export async function photoExists(p: ProgressPhoto) {
  const info = await FileSystem.getInfoAsync(`${DIR}${p.id}.jpg`);
  return info.exists;
}

export const photoUri = (p: ProgressPhoto) => `${DIR}${p.id}.jpg`;