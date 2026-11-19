import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '../contexts/AuthContext';
import { useDashboard } from '../hooks/useDashboard';
import { CsvKind, exportBackupZip, exportCsv, exportJson, restoreFrom } from '../services/backup';
import { toast } from '../utils/toast';
import { colors, radius, spacing } from '../theme';

type RowProps = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  hint: string;
  busy: boolean;
  disabled: boolean;
  onPress: () => void;
};

function Row({ icon, title, hint, busy, disabled, onPress }: RowProps) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[styles.row, disabled && !busy && { opacity: 0.5 }]}>
      <Ionicons name={icon} size={24} color={colors.primary} />
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowHint}>{hint}</Text>
      </View>
      {busy ? <ActivityIndicator color={colors.primary} /> : <Ionicons name="chevron-forward" size={18} color={colors.muted} />}
    </Pressable>
  );
}

export default function BackupScreen() {
  const { user } = useAuth();
  const dash = useDashboard();
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (key: string, fn: () => Promise<void>) => {
    if (!user || busy) return;
    setBusy(key);
    try {
      await fn();
    } catch (e) {
      toast.error((e as Error).message || 'Algo deu errado.');
    } finally {
      setBusy(null);
    }
  };

  const csv = (kind: CsvKind) => run(kind, () => exportCsv(user!.uid, kind));

  const backup = () =>
    run('zip', async () => {
      const r = await exportBackupZip(user!.uid);
      if (r.missing) Alert.alert('Fotos ausentes', `${r.missing} foto(s) não foram encontradas no aparelho e ficaram fora do backup.`);
    });

  const restore = () =>
    Alert.alert(
      'Restaurar backup',
      'Os dados do arquivo serão mesclados aos atuais. Registros com o mesmo ID ou a mesma data serão sobrescritos.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Escolher arquivo',
          onPress: () =>
            run('restore', async () => {
              const res = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
              if (res.canceled || !res.assets?.length) return;
              const r = await restoreFrom(user!.uid, res.assets[0].uri);
              await dash.reload();
              Alert.alert(
                'Backup restaurado',
                `Treinos: ${r.workouts}\nPeso: ${r.bodyWeights}\nMedições: ${r.measurements}\nRotinas: ${r.routines}\nExercícios: ${r.exercises}\nFotos: ${r.progressPhotos} (${r.photos} arquivos)\nAnálises: ${r.analyses}\nPresenças: ${r.attendance ?? 0}\nAtividades: ${r.activities ?? 0}\nPassos e sono: ${r.dailyLogs ?? 0}`
              );
            }),
        },
      ]
    );

  const off = !!busy;

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl * 2 }}>
      <View style={styles.summary}>
        <Text style={styles.sumText}>
          {dash.workouts.length} treinos · {dash.weights.length} pesos · {dash.measurements.length} medições ·{' '}
          {dash.photos.length} fotos
        </Text>
      </View>

      <View style={styles.warn}>
        <Ionicons name="information-circle" size={20} color={colors.warning} />
        <Text style={styles.warnText}>
          As fotos ficam só neste aparelho. Se desinstalar o app ou trocar de celular, elas só voltam com o backup completo.
        </Text>
      </View>

      <Text style={styles.section}>Backup completo</Text>
      <Row
        icon="archive-outline"
        title="Criar backup (.zip)"
        hint="Todos os dados e as fotos. Salve no Drive, iCloud ou envie para você."
        busy={busy === 'zip'}
        disabled={off}
        onPress={backup}
      />
      <Row
        icon="cloud-download-outline"
        title="Restaurar backup"
        hint="Aceita o .zip completo ou o .json de dados."
        busy={busy === 'restore'}
        disabled={off}
        onPress={restore}
      />

      <Text style={styles.section}>Exportar dados</Text>
      <Row
        icon="document-text-outline"
        title="Dados em JSON"
        hint="Tudo, sem fotos."
        busy={busy === 'json'}
        disabled={off}
        onPress={() => run('json', () => exportJson(user!.uid))}
      />
      <Row icon="barbell-outline" title="Treinos (CSV)" hint="Uma linha por série." busy={busy === 'workouts'} disabled={off} onPress={() => csv('workouts')} />
      <Row icon="speedometer-outline" title="Peso corporal (CSV)" hint="Data, peso e % de gordura." busy={busy === 'weights'} disabled={off} onPress={() => csv('weights')} />
      <Row icon="resize-outline" title="Medições (CSV)" hint="Uma coluna por local." busy={busy === 'measurements'} disabled={off} onPress={() => csv('measurements')} />
      <Row icon="walk-outline" title="Atividades (CSV)" hint="Corrida, natação, caminhada e bicicleta, com ritmo e kcal." busy={busy === 'activities'} disabled={off} onPress={() => csv('activities')} />
      <Row icon="moon-outline" title="Passos e sono (CSV)" hint="Um registro por dia." busy={busy === 'dailyLogs'} disabled={off} onPress={() => csv('dailyLogs')} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  summary: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md },
  sumText: { color: colors.text, fontSize: 14, textAlign: 'center' },
  warn: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  warnText: { color: colors.text, fontSize: 13, lineHeight: 18, flex: 1 },
  section: { color: colors.text, fontSize: 18, fontWeight: '700', marginTop: spacing.lg, marginBottom: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 64,
    padding: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  rowTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  rowHint: { color: colors.muted, fontSize: 12, marginTop: 2, lineHeight: 16 },
});
