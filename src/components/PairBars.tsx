import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme';

type Item = { label: string; a: number; b: number };
type Props = { data: Item[]; height?: number; aLabel: string; bLabel: string; aColor?: string; bColor?: string };

export default function PairBars({ data, height = 140, aLabel, bLabel, aColor = colors.primary, bColor = colors.warning }: Props) {
  const max = Math.max(...data.flatMap((d) => [d.a, d.b]), 1);
  const ih = height - 20;
  return (
    <View>
      <View style={styles.legend}>
        <View style={[styles.dot, { backgroundColor: aColor }]} />
        <Text style={styles.legendText}>{aLabel}</Text>
        <View style={[styles.dot, { backgroundColor: bColor, marginLeft: spacing.md }]} />
        <Text style={styles.legendText}>{bLabel}</Text>
      </View>
      <View style={[styles.row, { height }]}>
        {data.map((d, i) => (
          <View key={d.label + i} style={styles.col}>
            <View style={[styles.bars, { height: ih }]}>
              <View style={[styles.bar, { height: Math.max(2, (d.a / max) * ih), backgroundColor: d.a ? aColor : colors.border }]} />
              <View style={[styles.bar, { height: Math.max(2, (d.b / max) * ih), backgroundColor: d.b ? bColor : colors.border }]} />
            </View>
            <Text style={styles.label}>{d.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  legend: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  legendText: { color: colors.muted, fontSize: 12 },
  row: { flexDirection: 'row', alignItems: 'flex-end' },
  col: { flex: 1, alignItems: 'center' },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  bar: { width: 9, borderRadius: 2 },
  label: { color: colors.muted, fontSize: 10, marginTop: 4 },
});
