import { useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';

import { useI18n } from '@aura/core';

import { colors } from '@/theme';

type PickerMode = 'date' | 'time';

function mergeDate(base: Date, selected: Date) {
  const merged = new Date(base);
  merged.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
  return merged;
}

function mergeTime(base: Date, selected: Date) {
  const merged = new Date(base);
  merged.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
  return merged;
}

export function DateTimeField({
  label,
  value,
  onChange,
  includeTime = true,
}: {
  label: string;
  value?: string;
  onChange: (value: string | undefined) => void;
  includeTime?: boolean;
}) {
  const { formatDate, formatDateTime } = useI18n();
  const [pickerMode, setPickerMode] = useState<PickerMode | null>(null);
  const currentValue = useMemo(() => (value ? new Date(value) : new Date()), [value]);
  const displayValue = value
    ? includeTime
      ? formatDateTime(value)
      : formatDate(value)
    : 'Não definido';

  const handleChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (event.type === 'dismissed' || !selectedDate) {
      setPickerMode(null);
      return;
    }

    const nextValue =
      pickerMode === 'time'
        ? mergeTime(currentValue, selectedDate)
        : mergeDate(currentValue, selectedDate);

    onChange(nextValue.toISOString());
    setPickerMode(null);
  };

  if (Platform.OS === 'web') {
    return (
      <View style={styles.field}>
        <Text style={styles.label}>{label}</Text>
        <TextInput
          value={value ?? ''}
          onChangeText={(nextValue) => onChange(nextValue || undefined)}
          style={styles.input}
          placeholder="2026-05-10T18:00:00.000Z"
          placeholderTextColor={colors.inkSoft}
        />
      </View>
    );
  }

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.card}>
        <Text style={styles.value}>{displayValue}</Text>
        <View style={styles.actions}>
          <Pressable style={styles.button} onPress={() => setPickerMode('date')}>
            <Text style={styles.buttonText}>Data</Text>
          </Pressable>
          {includeTime ? (
            <Pressable style={styles.button} onPress={() => setPickerMode('time')}>
              <Text style={styles.buttonText}>Hora</Text>
            </Pressable>
          ) : null}
          <Pressable style={styles.clearButton} onPress={() => onChange(undefined)}>
            <Text style={styles.clearButtonText}>Limpar</Text>
          </Pressable>
        </View>
      </View>
      {pickerMode ? (
        <DateTimePicker
          value={currentValue}
          mode={pickerMode}
          onChange={handleChange}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.inkSoft,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    padding: 14,
    gap: 12,
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  button: {
    borderRadius: 999,
    backgroundColor: colors.ink,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  buttonText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: '700',
  },
  clearButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surfaceMuted,
  },
  clearButtonText: {
    color: colors.inkSoft,
    fontSize: 12,
    fontWeight: '700',
  },
  input: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.ink,
  },
});
