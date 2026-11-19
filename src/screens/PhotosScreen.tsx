import React, { useCallback, useMemo, useState } from 'react';
import EmptyState from '../components/EmptyState';
import { Alert, Dimensions, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import Input from '../components/Input';
import Button from '../components/Button';
import Chips from '../components/Chips';
import { useAuth } from '../contexts/AuthContext';
import { listPhotos, photoUri, removePhoto, savePhoto } from '../services/photos';
import { PhotoAngle, ProgressPhoto } from '../types';
import { RootStackParamList } from '../navigation/types';
import { parseNum } from '../utils/workout';
import { formatDateBR, toDateKey } from '../utils/date';
import { colors, radius, spacing } from '../theme';

type Filter = PhotoAngle | 'all';

const ANGLE_LABELS: Record<PhotoAngle, string> = { front: 'Frente', side: 'Lado', back: 'Costas' };

const angleOpts: { key: PhotoAngle; label: string }[] = [
  { key: 'front', label: 'Frente' },
  { key: 'side', label: 'Lado' },
  { key: 'back', label: 'Costas' },
];

const filterOpts: { key: Filter; label: string }[] = [{ key: 'all', label: 'Todas' }, ...angleOpts];

const SIZE = (Dimensions.get('window').width - spacing.lg * 2 - spacing.sm * 2) / 3;

export default function PhotosScreen() {
  const { user } = useAuth();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [list, setList] = useState<ProgressPhoto[]>([]);
  const [angle, setAngle] = useState<PhotoAngle>('front');
  const [date, setDate] = useState(toDateKey());
  const [kg, setKg] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      setList(await listPhotos(user.uid));
    } catch {}
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const shown = useMemo(
    () => [...list].filter((p) => filter === 'all' || p.angle === filter).reverse(),
    [list, filter]
  );

  const store = async (uri: string) => {
    if (!user) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > toDateKey())
      return Alert.alert('Data inválida', 'Use AAAA-MM-DD, sem datas futuras.');
    setBusy(true);
    try {
      await savePhoto(user.uid, uri, date, angle, parseNum(kg) || undefined);
      await load();
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar a foto.');
    } finally {
      setBusy(false);
    }
  };

  const camera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return Alert.alert('Permissão negada', 'Libere a câmera nas configurações.');
    const r = await ImagePicker.launchCameraAsync({ quality: 1, allowsEditing: false });
    if (!r.canceled) store(r.assets[0].uri);
  };

  const gallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert('Permissão negada', 'Libere a galeria nas configurações.');
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (!r.canceled) store(r.assets[0].uri);
  };

  const remove = (p: ProgressPhoto) =>
    Alert.alert('Excluir foto', `${ANGLE_LABELS[p.angle]} · ${formatDateBR(p.date)}`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          if (!user) return;
          await removePhoto(user.uid, p);
          load();
        },
      },
    ]);

  const header = (
    <View>
      <Chips options={angleOpts} value={angle} onChange={setAngle} />
      <View style={styles.form}>
        <View style={{ flex: 1 }}>
          <Input label="Data" value={date} onChangeText={setDate} placeholder="AAAA-MM-DD" />
        </View>
        <View style={{ flex: 0.7 }}>
          <Input label="Peso (kg)" value={kg} onChangeText={setKg} keyboardType="decimal-pad" placeholder="opcional" />
        </View>
      </View>
      <View style={styles.actions}>
        <View style={{ flex: 1 }}>
          <Button title="Câmera" onPress={camera} loading={busy} />
        </View>
        <View style={{ flex: 1 }}>
          <Button title="Galeria" onPress={gallery} loading={busy} variant="ghost" />
        </View>
      </View>
      <View style={{ height: spacing.sm }} />
      <Button
        title="Comparar lado a lado"
        onPress={() => nav.navigate('PhotoCompare')}
        variant="ghost"
      />
      <Text style={styles.section}>Fotos</Text>
      <Chips options={filterOpts} value={filter} onChange={setFilter} />
    </View>
  );

  return (
    <View style={styles.wrap}>
      <FlatList
        data={shown}
        keyExtractor={(p) => p.id}
        numColumns={3}
        columnWrapperStyle={{ gap: spacing.sm }}
        ListHeaderComponent={header}
        ListEmptyComponent={<EmptyState icon="camera-outline" title="Nenhuma foto" hint="Registre fotos de frente, lado e costas." />}
        ListFooterComponent={<View style={{ height: spacing.xl }} />}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <Pressable onLongPress={() => remove(item)} style={styles.thumbWrap}>
            <Image source={{ uri: photoUri(item) }} style={styles.thumb} contentFit="cover" />
            <Text style={styles.cap}>
              {ANGLE_LABELS[item.angle]} · {formatDateBR(item.date).slice(0, 5)}
            </Text>
          </Pressable>
        )}
      />
      <Text style={styles.hint}>Segure uma foto para excluir</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg, padding: spacing.lg },
  form: { flexDirection: 'row', gap: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.sm },
  section: { color: colors.text, fontSize: 18, fontWeight: '700', marginTop: spacing.lg, marginBottom: spacing.sm },
  empty: { color: colors.muted, textAlign: 'center', marginTop: spacing.md },
  thumbWrap: { width: SIZE, marginBottom: spacing.sm },
  thumb: { width: SIZE, height: SIZE * 1.35, borderRadius: radius.sm, backgroundColor: colors.card },
  cap: { color: colors.muted, fontSize: 11, marginTop: 3, textAlign: 'center' },
  hint: { color: colors.muted, fontSize: 12, textAlign: 'center', paddingTop: spacing.xs },
});