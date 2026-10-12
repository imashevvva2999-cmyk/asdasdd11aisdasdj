import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { EmptyState, Icon, IconButton, PressableScale, SheetScreen, TextLinkButton } from '@/components/ui';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { unreadCountSubtitle, unreadRowPrefix } from '@/lib/i18n';
import { goBack } from '@/lib/navigation';
import { useAppStrings } from '@/state/locale-store';
import { countUnread, notificationContent, useNotificationsStore, type DemoNotification } from '@/state/notifications-store';

/**
 * Notifications drawer opened from the Search header bell. Frontend demo only
 * (OQ-27): a fixed local list labelled "Demo", no push notifications or
 * backend. Tapping an item marks it read and opens what it refers to.
 */
export default function NotificationsSheet() {
  const items = useNotificationsStore((s) => s.items);
  const markRead = useNotificationsStore((s) => s.markRead);
  const markAllRead = useNotificationsStore((s) => s.markAllRead);
  const clearAll = useNotificationsStore((s) => s.clearAll);
  const unread = countUnread(items);
  const { locale, t } = useAppStrings();

  function open(item: DemoNotification) {
    markRead(item.id);
    goBack();
    const { target } = item;
    if (target.kind === 'support-history') router.push('/profile/support-history');
    else if (target.kind === 'album') router.push({ pathname: '/album/[id]', params: { id: target.id } });
    else if (target.kind === 'artist') router.push({ pathname: '/artist/[id]', params: { id: target.id } });
    else router.push({ pathname: '/playlist/[id]', params: { id: target.id } });
  }

  return (
    <SheetScreen>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <View style={styles.titleRow}>
            <ThemedText variant="headline-md">{t('notificationsLabel')}</ThemedText>
            <View style={styles.demoPill}>
              <ThemedText variant="label-sm" emphasis="medium">
                {t('demoPillLabel')}
              </ThemedText>
            </View>
          </View>
          <ThemedText variant="body-sm" emphasis="medium">
            {unread > 0 ? unreadCountSubtitle(locale, unread) : t('allCaughtUpLabel')}
          </ThemedText>
        </View>
        <IconButton icon="close" size={36} accessibilityLabel={t('closeLabel')} onPress={() => goBack()} />
      </View>

      {items.length === 0 ? (
        <EmptyState icon="notifications-none" title={t('notificationsEmptyTitle')} hint={t('notificationsEmptyHint')} />
      ) : (
        <>
          <View style={styles.actions}>
            <TextLinkButton label={t('markAllReadLabel')} tone="muted" onPress={markAllRead} disabled={unread === 0} />
            <TextLinkButton label={t('clearAll')} tone="muted" onPress={clearAll} />
          </View>
          <ScrollView contentContainerStyle={styles.list}>
            {items.map((item) => {
              const content = notificationContent(item.id, locale);
              return (
                <PressableScale
                  key={item.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.read ? '' : unreadRowPrefix(locale)}${content.title}. ${content.body}`}
                  onPress={() => open(item)}
                  style={[styles.row, !item.read && styles.rowUnread]}
                >
                  <View style={styles.iconTile}>
                    <Icon name={item.icon} size={20} color={Colors.primary} />
                  </View>
                  <View style={styles.rowText}>
                    <View style={styles.rowTitle}>
                      <ThemedText variant="label-lg" numberOfLines={1} style={styles.flexText}>
                        {content.title}
                      </ThemedText>
                      <ThemedText variant="body-sm" emphasis="low">
                        {content.timeLabel}
                      </ThemedText>
                    </View>
                    <ThemedText variant="body-sm" emphasis="medium" numberOfLines={2}>
                      {content.body}
                    </ThemedText>
                  </View>
                  {!item.read && <View style={styles.unreadDot} />}
                </PressableScale>
              );
            })}
          </ScrollView>
        </>
      )}
    </SheetScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.margin,
    paddingTop: Spacing.sm,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  demoPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radii.full,
    backgroundColor: Colors.surface.l3,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.lg,
    paddingHorizontal: Spacing.margin,
    paddingTop: Spacing.md,
  },
  list: {
    paddingHorizontal: Spacing.margin,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    gap: Spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.sm,
    borderRadius: Radii.md,
  },
  rowUnread: {
    backgroundColor: Colors.surface.l2,
  },
  iconTile: {
    width: 40,
    height: 40,
    borderRadius: Radii.DEFAULT,
    backgroundColor: 'rgba(255, 75, 75, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  rowTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  flexText: {
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
});
