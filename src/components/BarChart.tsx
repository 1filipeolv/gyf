import React, { useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';
import { colors } from '../theme';

type Bar = { label: string; value: number };
type Props = { data: Bar[]; height?: number; format?: (v: number) => string };

export default function BarChart({ data, height = 140, format }: Props) {
  const [w, setW] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);
  if (!w || !data.length) return <View style={{ height }} onLayout={onLayout} />;

  const max = Math.max(...data.map((d) => d.value), 1);
  const slot = w / data.length;
  const bw = Math.min(28, slot * 0.6);
  const ih = height - 22;

  return (
    <View onLayout={onLayout} style={styles.wrap}>
      <Svg width={w} height={height}>
        {data.map((d, i) => {
          const h = (d.value / max) * (ih - 14);
          const x = i * slot + (slot - bw) / 2;
          const last = i === data.length - 1;
          return (
            <React.Fragment key={d.label + i}>
              <Rect
                x={x}
                y={ih - h}
                width={bw}
                height={Math.max(h, 2)}
                rx={4}
                fill={last ? colors.primary : colors.border}
              />
              <SvgText x={x + bw / 2} y={ih - h - 4} fill={colors.muted} fontSize={10} textAnchor="middle">
                {d.value > 0
                  ? format
                    ? format(d.value)
                    : d.value >= 1000
                      ? `${(d.value / 1000).toFixed(1)}t`
                      : Math.round(d.value)
                  : ''}
              </SvgText>
              <SvgText x={x + bw / 2} y={height - 6} fill={colors.muted} fontSize={10} textAnchor="middle">
                {d.label}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({ wrap: { width: '100%' } });