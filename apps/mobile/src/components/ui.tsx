import type { PropsWithChildren, ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useI18n } from '@aura/core';

import { colors } from '@/theme';

export function ScreenShell({
  title,
  subtitle,
  children,
  footer,
}: PropsWithChildren<{ title: string; subtitle: string; footer?: ReactNode }>) {
  const { locale, locales, localeLabel, setLocale, t } = useI18n();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>AURA</Text>
          <Text style={styles.localeLabel}>{t('common.localeSelectorLabel')}</Text>
          <View style={styles.localeRow}>
            {locales.map((supportedLocale) => (
              <Pressable
                key={supportedLocale}
                onPress={() => {
                  void setLocale(supportedLocale);
                }}
                style={[
                  styles.localeChip,
                  locale === supportedLocale ? styles.localeChipActive : null,
                ]}
              >
                <Text
                  style={[
                    styles.localeChipText,
                    locale === supportedLocale ? styles.localeChipTextActive : null,
                  ]}
                >
                  {localeLabel(supportedLocale)}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        {children}
      </ScrollView>
      {footer}
    </SafeAreaView>
  );
}

export function SectionCard({
  title,
  description,
  children,
}: PropsWithChildren<{ title: string; description?: string }>) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {description ? <Text style={styles.cardDescription}>{description}</Text> : null}
      <View style={styles.cardBody}>{children}</View>
    </View>
  );
}

export function EmptyCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <View style={[styles.card, styles.emptyCard]}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardDescription}>{description}</Text>
    </View>
  );
}

export function FeedbackCard({
  tone,
  message,
}: {
  tone: 'success' | 'error' | 'warning';
  message: string;
}) {
  return (
    <View
      style={[
        styles.feedbackCard,
        tone === 'success'
          ? styles.feedbackSuccess
          : tone === 'warning'
            ? styles.feedbackWarning
            : styles.feedbackError,
      ]}
    >
      <Text
        style={[
          styles.feedbackText,
          tone === 'success'
            ? styles.feedbackSuccessText
            : tone === 'warning'
              ? styles.feedbackWarningText
              : styles.feedbackErrorText,
        ]}
      >
        {message}
      </Text>
    </View>
  );
}

export function MetricCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <View style={[styles.card, styles.metricCard]}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricHelper}>{helper}</Text>
    </View>
  );
}

export function Pill({
  children,
  tone = 'default',
}: PropsWithChildren<{ tone?: 'default' | 'success' | 'warning' | 'accent' }>) {
  const toneStyle =
    tone === 'success'
      ? styles.pillSuccess
      : tone === 'warning'
        ? styles.pillWarning
        : tone === 'accent'
          ? styles.pillAccent
          : styles.pillDefault;

  const textStyle =
    tone === 'success'
      ? styles.pillSuccessText
      : tone === 'warning'
        ? styles.pillWarningText
        : tone === 'accent'
          ? styles.pillAccentText
          : styles.pillDefaultText;

  return (
    <View style={[styles.pill, toneStyle]}>
      <Text style={[styles.pillText, textStyle]}>{children}</Text>
    </View>
  );
}

export function ActionButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        variant === 'primary' ? styles.buttonPrimary : styles.buttonSecondary,
        disabled ? styles.buttonDisabled : null,
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          variant === 'primary' ? styles.buttonTextPrimary : styles.buttonTextSecondary,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function BottomNav({
  activeTab,
  onChange,
}: {
  activeTab: string;
  onChange: (tab: string) => void;
}) {
  const { t } = useI18n();
  const tabs = [
    { key: 'dashboard', label: t('nav.dashboard') },
    { key: 'clients', label: t('nav.clients') },
    { key: 'agenda', label: t('nav.agenda') },
    { key: 'notifications', label: t('nav.notifications') },
  ];

  return (
    <View style={styles.bottomNav}>
      {tabs.map((tab) => (
        <Pressable
          key={tab.key}
          onPress={() => onChange(tab.key)}
          style={[
            styles.navItem,
            activeTab === tab.key ? styles.navItemActive : null,
          ]}
        >
          <Text
            style={[
              styles.navLabel,
              activeTab === tab.key ? styles.navLabelActive : null,
            ]}
          >
            {tab.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 110,
    gap: 14,
  },
  hero: {
    paddingTop: 8,
    paddingBottom: 8,
  },
  localeLabel: {
    marginTop: 10,
    fontSize: 11,
    fontWeight: '700',
    color: colors.inkSoft,
    textTransform: 'uppercase',
    letterSpacing: 1.6,
  },
  localeRow: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  localeChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  localeChipActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  localeChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.inkSoft,
  },
  localeChipTextActive: {
    color: colors.surface,
  },
  eyebrow: {
    fontSize: 12,
    letterSpacing: 4,
    textTransform: 'uppercase',
    color: colors.accent,
    fontWeight: '700',
  },
  title: {
    marginTop: 10,
    fontSize: 32,
    lineHeight: 36,
    color: colors.ink,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 24,
    color: colors.inkSoft,
  },
  card: {
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 18,
    gap: 10,
  },
  emptyCard: {
    borderStyle: 'dashed',
    backgroundColor: colors.surfaceMuted,
  },
  metricCard: {
    minHeight: 136,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
  },
  cardDescription: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.inkSoft,
  },
  cardBody: {
    gap: 10,
  },
  feedbackCard: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  feedbackText: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600',
  },
  feedbackSuccess: {
    backgroundColor: '#dcfce7',
  },
  feedbackError: {
    backgroundColor: '#fee2e2',
  },
  feedbackWarning: {
    backgroundColor: '#ffedd5',
  },
  feedbackSuccessText: {
    color: '#047857',
  },
  feedbackErrorText: {
    color: '#b91c1c',
  },
  feedbackWarningText: {
    color: '#c2410c',
  },
  metricLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: colors.inkSoft,
    fontWeight: '700',
  },
  metricValue: {
    fontSize: 28,
    color: colors.ink,
    fontWeight: '700',
  },
  metricHelper: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.inkSoft,
  },
  pill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  pillDefault: {
    backgroundColor: '#f5f5f4',
  },
  pillSuccess: {
    backgroundColor: '#dcfce7',
  },
  pillWarning: {
    backgroundColor: '#ffedd5',
  },
  pillAccent: {
    backgroundColor: '#ccfbf1',
  },
  pillDefaultText: {
    color: colors.inkSoft,
  },
  pillSuccessText: {
    color: colors.success,
  },
  pillWarningText: {
    color: colors.warning,
  },
  pillAccentText: {
    color: colors.accent,
  },
  button: {
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: colors.ink,
  },
  buttonSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  buttonTextPrimary: {
    color: colors.surface,
  },
  buttonTextSecondary: {
    color: colors.inkSoft,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  bottomNav: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 18,
    flexDirection: 'row',
    gap: 8,
    padding: 8,
    borderRadius: 26,
    backgroundColor: colors.ink,
  },
  navItem: {
    flex: 1,
    borderRadius: 20,
    paddingVertical: 12,
    alignItems: 'center',
  },
  navItemActive: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  navLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#d6d3d1',
  },
  navLabelActive: {
    color: '#fff7ed',
  },
});
