import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { isTutorialSeen, markTutorialSeen } from '../utils/tutorial';
import { colors, radius, spacing } from '../theme';

type Step = { title: string; text: string };

export default function Tutorial({ id, steps }: { id: string; steps: Step[] }) {
  const [visible, setVisible] = useState(false);
  const [i, setI] = useState(0);

  useEffect(() => {
    isTutorialSeen(id).then((seen) => !seen && setVisible(true));
  }, [id]);

  const close = () => {
    markTutorialSeen(id);
    setVisible(false);
  };
  const last = i >= steps.length - 1;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <View style={styles.backdrop}>
        <View style={styles.box}>
          <Text style={styles.count}>
            {i + 1} de {steps.length}
          </Text>
          <Text style={styles.title}>{steps[i].title}</Text>
          <Text style={styles.text}>{steps[i].text}</Text>
          <Pressable onPress={last ? close : () => setI(i + 1)} style={styles.btn}>
            <Text style={styles.btnText}>{last ? 'Entendi' : 'Próximo'}</Text>
          </Pressable>
          {!last && (
            <Pressable onPress={close} style={styles.skip}>
              <Text style={styles.skipText}>Pular</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: spacing.lg },
  box: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  count: { color: colors.muted, fontSize: 12, marginBottom: spacing.sm },
  title: { color: colors.text, fontSize: 22, fontWeight: '800', marginBottom: spacing.sm },
  text: { color: colors.text, fontSize: 16, lineHeight: 24, marginBottom: spacing.lg },
  btn: { height: 60, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  skip: { height: 48, alignItems: 'center', justifyContent: 'center' },
  skipText: { color: colors.muted, fontSize: 14 },
});
