import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../context/ThemeContext';

interface PlanCardProps {
  plan: {
    id: string;
    name: string;
    price: number;
    originalPrice?: number;
    original_price?: number;
    mrp?: number;
    regularPrice?: number;
    regular_price?: number;
    duration?: string;
    features?: string[];
    popular?: boolean;
  };
  isSelected: boolean;
  isActive?: boolean;
  isPending?: boolean;
  onSelect: () => void;
  isSinglePlan?: boolean;
}

const PlanCard: React.FC<PlanCardProps> = ({
  plan,
  isSelected,
  isActive = false,
  isPending = false,
  onSelect,
  isSinglePlan = false,
}) => {
  const { theme } = useTheme();

  // Pick border and shadow colors based on status
  const cardBorderColor = isActive
    ? theme.colors.success
    : isSelected
      ? theme.colors.primary
      : theme.colors.border;

  const cardShadowColor = isActive
    ? theme.colors.success
    : isSelected
      ? theme.colors.primary
      : '#000000';

  return (
    <TouchableOpacity
      style={[
        styles.planCard,
        isSinglePlan && styles.singlePlanCard,
        {
          backgroundColor: theme.colors.cardBackground,
          borderColor: cardBorderColor,
          borderWidth: (isActive || isSelected) ? 2 : 1,
          shadowColor: cardShadowColor,
          shadowOpacity: (isActive || isSelected) ? 0.15 : 0.08,
          shadowRadius: (isActive || isSelected) ? 12 : 6,
          elevation: (isActive || isSelected) ? 8 : 4,
        },
      ]}
      onPress={onSelect}
      activeOpacity={0.8}
    >
      <View style={styles.planHeader}>
        <View style={styles.headerTopRow}>
          <Text style={[styles.planName, { color: theme.colors.text }]}>
            {plan.name}
          </Text>
          
          <View style={styles.badgeContainer}>
            {isActive && (
              <LinearGradient
                colors={['#10B981', '#059669']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.badgeGradient}
              >
                <Icon name="check" size={11} color="#ffffff" style={styles.badgeIcon} />
                <Text style={styles.badgeText}>ACTIVE</Text>
              </LinearGradient>
            )}
            
            {isPending && (
              <LinearGradient
                colors={['#F59E0B', '#D97706']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.badgeGradient}
              >
                <Icon name="hourglass-empty" size={11} color="#ffffff" style={styles.badgeIcon} />
                <Text style={styles.badgeText}>PENDING</Text>
              </LinearGradient>
            )}
            
            {plan.popular && !isActive && !isPending && (
              <LinearGradient
                colors={['#8B5CF6', '#6366F1']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.popularBadge}
              >
                <Icon name="star" size={11} color="#ffffff" style={styles.badgeIcon} />
                <Text style={styles.popularBadgeText}>POPULAR</Text>
              </LinearGradient>
            )}
          </View>
        </View>

        {(() => {
          // 1. Use originalPrice if explicitly provided by the API
          const rawOriginal = plan.originalPrice ?? plan.original_price ?? plan.mrp ?? plan.regularPrice ?? plan.regular_price ?? null;
          let parsedOriginal: number | null = typeof rawOriginal === 'number' && rawOriginal > plan.price
            ? rawOriginal
            : typeof rawOriginal === 'string'
              ? (() => { const p = parseFloat(rawOriginal.replace(/[^\d.]/g, '')); return (Number.isFinite(p) && p > plan.price) ? p : null; })()
              : null;

          // 2. If not provided, check if plan name explicitly says "X% Off" / "X% OFF"
          if (!parsedOriginal) {
            const nameMatch = String(plan.name || '').match(/(\d+)%\s*[Oo]ff/i);
            if (nameMatch) {
              const discountPct = parseInt(nameMatch[1], 10);
              if (discountPct > 0 && discountPct < 100) {
                parsedOriginal = Math.round(plan.price / (1 - discountPct / 100));
              }
            }
          }

          const hasDiscount = parsedOriginal !== null && parsedOriginal > plan.price;
          const discountPercent = hasDiscount ? Math.round(((parsedOriginal! - plan.price) / parsedOriginal!) * 100) : 0;

          return (
            <View style={styles.priceContainer}>
              {hasDiscount && (
                <Text style={[styles.originalPrice, { color: theme.colors.textSecondary }]}>
                  ₹{parsedOriginal}
                </Text>
              )}
              <Text style={[styles.price, { color: theme.colors.primary }]}>
                ₹{plan.price}
              </Text>
              {plan.duration && (
                <Text style={[styles.duration, { color: theme.colors.textSecondary }]}>
                  /{plan.duration}
                </Text>
              )}
              {hasDiscount && discountPercent > 0 && (
                <View style={styles.discountTag}>
                  <Text style={styles.discountTagText}>{discountPercent}% OFF</Text>
                </View>
              )}
            </View>
          );
        })()}
      </View>

      <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

      {(() => {
        // Robust parser for features list to handle JSON arrays, strings, newlines, and commas
        const parsedFeatures: string[] = [];
        const rawFeatures = plan.features;

        if (Array.isArray(rawFeatures)) {
          rawFeatures.forEach(feat => {
            if (typeof feat === 'string') {
              const trimmed = feat.trim();
              if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
                try {
                  const parsed = JSON.parse(trimmed);
                  if (Array.isArray(parsed)) {
                    parsed.forEach(x => parsedFeatures.push(String(x).trim()));
                    return;
                  }
                } catch (e) {}
              }
              // Split by newline if present, otherwise push
              const lines = trimmed.split('\n').map(l => l.trim()).filter(Boolean);
              parsedFeatures.push(...lines);
            } else if (feat) {
              parsedFeatures.push(String(feat).trim());
            }
          });
        } else if (typeof rawFeatures === 'string') {
          const trimmed = rawFeatures.trim();
          if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
            try {
              const parsed = JSON.parse(trimmed);
              if (Array.isArray(parsed)) {
                parsed.forEach(x => parsedFeatures.push(String(x).trim()));
              }
            } catch (e) {
              // Fallback if not valid JSON array
              const lines = trimmed.replace(/[\[\]"]/g, '').split(/[\n,]/).map(l => l.trim()).filter(Boolean);
              parsedFeatures.push(...lines);
            }
          } else {
            const lines = trimmed.split(/[\n,]/).map(l => l.trim()).filter(Boolean);
            parsedFeatures.push(...lines);
          }
        }

        if (parsedFeatures.length === 0) return null;

        return (
          <View style={styles.featuresList}>
            {parsedFeatures.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <Icon 
                  name="check" 
                  size={16} 
                  color={isActive ? '#10B981' : theme.colors.primary} 
                  style={styles.checkIcon}
                />
                <Text style={[styles.featureText, { color: theme.colors.textSecondary }]}>
                  {feature}
                </Text>
              </View>
            ))}
          </View>
        );
      })()}

      {isSelected && !isActive && (
        <View style={[styles.selectedIndicator, { backgroundColor: theme.colors.primary }]}>
          <Icon name="check" size={14} color="#ffffff" />
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  planCard: {
    borderRadius: 16,
    padding: 20,
    marginVertical: 8,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    position: 'relative',
  },
  singlePlanCard: {
    maxWidth: '95%',
    width: '95%',
    alignSelf: 'center',
  },
  planHeader: {
    marginBottom: 4,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  planName: {
    fontSize: 20,
    fontWeight: '700',
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeIcon: {
    marginRight: 4,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  popularBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  popularBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 4,
    flexWrap: 'wrap',
  },
  originalPrice: {
    fontSize: 18,
    fontWeight: '600',
    textDecorationLine: 'line-through',
    marginRight: 8,
    opacity: 0.6,
  },
  price: {
    fontSize: 28,
    fontWeight: '800',
  },
  duration: {
    fontSize: 14,
    marginLeft: 4,
    fontWeight: '500',
  },
  discountTag: {
    backgroundColor: '#16A34A',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
    alignSelf: 'center',
  },
  discountTagText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  divider: {
    height: 1,
    marginVertical: 14,
    opacity: 0.3,
  },
  featuresList: {
    marginTop: 2,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 5,
  },
  checkIcon: {
    marginRight: 8,
    marginTop: 1,
  },
  featureText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  selectedIndicator: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default PlanCard;
