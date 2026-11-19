import React, { useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';
import { Pt } from '../utils/trend';
import { colors } from '../theme';

type Props = { raw: Pt[]; trend: Pt[]; height?: number; target?: number };

const PAD = { l: 38, r: 10, t: 10, b: 10 };

export default function LineChart({ raw, trend, height = 200, target }: Props) {
  const [w, setW] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);

  if (!raw.length || !w) return <View style={{ height }} onLayout={onLayout} />;

  const ys = [...raw.map((p) => p.y), ...(target ? [target] : [])];
  const minY = Math.min(...ys) - 0.5;
  const maxY = Math.max(...ys) + 0.5;
  const minX = raw[0].x;
  const maxX = raw[raw.length - 1].x;
  const iw = w - PAD.l - PAD.r;
  const ih = height - PAD.t - PAD.b;
  const sx = (x: number) => PAD.l + (maxX === minX ? iw / 2 : ((x - minX) / (maxX - minX)) * iw);
  const sy = (y: number) => PAD.t + ih - ((y - minY) / (maxY - minY)) * ih;
  const line = (pts: Pt[]) => pts.map((p) => `${sx(p.x)},${sy(p.y)}`).join(' ');
  const ticks = [0, 1, 2, 3].map((i) => minY + ((maxY - minY) * i) / 3);

  return (
    <View onLayout={onLayout} style={styles.wrap}>
      <Svg width={w} height={height}>
        {ticks.map((t) => (
          <React.Fragment key={t}>
            <Line x1={PAD.l} x2={w - PAD.r} y1={sy(t)} y2={sy(t)} stroke={colors.border} strokeWidth={1} />
            <SvgText x={PAD.l - 6} y={sy(t) + 4} fill={colors.muted} fontSize={10} textAnchor="end">
              {t.toFixed(1)}
            </SvgText>
          </React.Fragment>
        ))}
        {target && (
          <Line
            x1={PAD.l}
            x2={w - PAD.r}
            y1={sy(target)}
            y2={sy(target)}
            stroke={colors.success}
            strokeWidth={1}
            strokeDasharray="5,4"
          />
        )}
        {raw.length > 1 && <Polyline points={line(raw)} fill="none" stroke={colors.muted} strokeWidth={1} opacity={0.5} />}
        {raw.map((p) => (
          <Circle key={p.x} cx={sx(p.x)} cy={sy(p.y)} r={3} fill={colors.muted} />
        ))}
        {trend.length > 1 && <Polyline points={line(trend)} fill="none" stroke={colors.primary} strokeWidth={3} />}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({ wrap: { width: '100%' } });