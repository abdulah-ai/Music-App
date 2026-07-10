import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useDashboardStore, WIDGET_LABELS, type AccentStyle, type Density } from '../../store/dashboardStore';
import { colors, radii, spacing, typography } from '../../theme/tokens';

function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { key: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((option) => {
        const active = option.key === value;
        return (
          <Pressable
            key={option.key}
            onPress={() => onChange(option.key)}
            style={[styles.segment, active && styles.segmentActive]}
          >
            <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function DashboardCustomizer({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const order = useDashboardStore((s) => s.order);
  const density = useDashboardStore((s) => s.density);
  const accentStyle = useDashboardStore((s) => s.accentStyle);
  const toggleWidget = useDashboardStore((s) => s.toggleWidget);
  const moveWidget = useDashboardStore((s) => s.moveWidget);
  const setDensity = useDashboardStore((s) => s.setDensity);
  const setAccentStyle = useDashboardStore((s) => s.setAccentStyle);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <Text style={styles.title}>Customize dashboard</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 480 }}>
            <Text style={styles.groupLabel}>LAYOUT DENSITY</Text>
            <SegmentedControl
              value={density}
              onChange={(v: Density) => setDensity(v)}
              options={[
                { key: 'compact', label: 'Compact' },
                { key: 'spacious', label: 'Spacious' },
              ]}
            />

            <Text style={styles.groupLabel}>ACCENT STYLE</Text>
            <SegmentedControl
              value={accentStyle}
              onChange={(v: AccentStyle) => setAccentStyle(v)}
              options={[
                { key: 'forest', label: 'Forest Night' },
                { key: 'cosmic', label: 'Cosmic Night' },
              ]}
            />

            <Text style={styles.groupLabel}>WIDGETS</Text>
            <View style={{ gap: spacing.xs }}>
              {order.map((widget, index) => (
                <View key={widget.id} style={[styles.widgetRow, !widget.visible && styles.widgetRowHidden]}>
                  <Pressable onPress={() => toggleWidget(widget.id)} style={styles.visibilityToggle} hitSlop={8}>
                    <Ionicons
                      name={widget.visible ? 'eye-outline' : 'eye-off-outline'}
                      size={18}
                      color={widget.visible ? colors.cyan : colors.textMuted}
                    />
                  </Pressable>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.widgetName}>{WIDGET_LABELS[widget.id].title}</Text>
                    <Text style={styles.widgetDesc}>{WIDGET_LABELS[widget.id].description}</Text>
                  </View>
                  <Pressable
                    onPress={() => moveWidget(widget.id, -1)}
                    disabled={index === 0}
                    hitSlop={8}
                    style={[styles.moveButton, index === 0 && styles.moveButtonDisabled]}
                  >
                    <Ionicons name="chevron-up" size={16} color={colors.textSecondary} />
                  </Pressable>
                  <Pressable
                    onPress={() => moveWidget(widget.id, 1)}
                    disabled={index === order.length - 1}
                    hitSlop={8}
                    style={[styles.moveButton, index === order.length - 1 && styles.moveButtonDisabled]}
                  >
                    <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
                  </Pressable>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...(StyleSheet.absoluteFill as object), backgroundColor: 'rgba(3,5,3,0.65)' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    maxHeight: '82%',
  },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(174,165,192,0.3)', marginBottom: spacing.md },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  title: { ...typography.title, fontSize: 18, color: colors.textPrimary },
  groupLabel: {
    ...typography.eyebrow,
    fontSize: 10,
    letterSpacing: 2,
    color: colors.textMuted,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  segmented: { flexDirection: 'row', backgroundColor: 'rgba(9,6,15,0.5)', borderRadius: radii.pill, padding: 3 },
  segment: { flex: 1, paddingVertical: spacing.sm, borderRadius: radii.pill, alignItems: 'center' },
  segmentActive: { backgroundColor: 'rgba(255,138,92,0.18)' },
  segmentLabel: { ...typography.caption, fontSize: 13, color: colors.textMuted },
  segmentLabelActive: { color: colors.cyan, fontFamily: 'Sora_600SemiBold' },
  widgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: 'rgba(27,20,38,0.4)',
  },
  widgetRowHidden: { opacity: 0.5 },
  visibilityToggle: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  widgetName: { ...typography.subtitle, fontSize: 14, color: colors.textPrimary },
  widgetDesc: { ...typography.caption, fontSize: 11, color: colors.textMuted },
  moveButton: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: radii.pill, backgroundColor: 'rgba(9,6,15,0.4)' },
  moveButtonDisabled: { opacity: 0.3 },
});
