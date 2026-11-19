import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import AnalysisView from '../components/AnalysisView';
import { RootStackParamList } from '../navigation/types';
import { colors, spacing } from '../theme';

export default function AnalysisDetailScreen() {
  const { params } = useRoute<RouteProp<RootStackParamList, 'AnalysisDetail'>>();
  return (
    <ScrollView style={styles.wrap} contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl * 2 }}>
      <AnalysisView analysis={params.analysis} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
});
