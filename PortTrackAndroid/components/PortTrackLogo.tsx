import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Rect, Defs, LinearGradient, Stop } from 'react-native-svg';

interface PortTrackLogoProps {
  size?: number;
  variant?: 'icon' | 'horizontal' | 'vertical';
  showTagline?: boolean;
  themeMode?: 'dark' | 'light';
}

export function PortTrackLogo({
  size = 48,
  variant = 'vertical',
  showTagline = true,
  themeMode = 'dark',
}: PortTrackLogoProps) {
  const iconSize = size;
  const isDark = themeMode === 'dark';

  const iconElement = (
    <Svg width={iconSize} height={iconSize} viewBox="0 0 100 100" fill="none">
      <Defs>
        <LinearGradient id="pMainGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#8b5cf6" />
          <Stop offset="50%" stopColor="#6366f1" />
          <Stop offset="100%" stopColor="#4f46e5" />
        </LinearGradient>
        <LinearGradient id="bar1Grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#ffffff" />
          <Stop offset="100%" stopColor="#e2e8f0" />
        </LinearGradient>
        <LinearGradient id="bar2Grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#a78bfa" />
          <Stop offset="100%" stopColor="#7c3aed" />
        </LinearGradient>
        <LinearGradient id="bar3Grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#818cf8" />
          <Stop offset="100%" stopColor="#4338ca" />
        </LinearGradient>
      </Defs>

      {/* P Harfi Dış Gövdesi & Üst Kavis (Modern Geometrik FinTech Ribbon) */}
      <Path
        d="M 42 12
           L 68 12
           C 85 12, 94 22, 94 38
           C 94 54, 84 64, 68 64
           L 54 64
           L 54 48
           L 66 48
           C 74 48, 79 43, 79 38
           C 79 32, 74 27, 66 27
           L 42 27
           C 30 27, 20 37, 20 50
           L 20 62
           C 20 40, 29 25, 42 12 Z"
        fill="url(#pMainGrad)"
      />

      {/* 1. Bar: Sol Kısa Çubuk (Beyaz / Aydınlık Kavis) */}
      <Path
        d="M 22 88
           C 22 75, 27 65, 33 55
           L 38 55
           C 34 65, 31 75, 31 88
           Z"
        fill="url(#bar1Grad)"
      />

      {/* 2. Bar: Orta Çubuk (Mor Gradyan) */}
      <Rect
        x="42"
        y="42"
        width="9"
        height="46"
        rx="4.5"
        fill="url(#bar2Grad)"
      />

      {/* 3. Bar: Sağ Uzun Çubuk (İndigo / Mavi Büyüme Barı) */}
      <Rect
        x="56"
        y="25"
        width="10"
        height="63"
        rx="5"
        fill="url(#bar3Grad)"
      />
    </Svg>
  );

  if (variant === 'icon') {
    return iconElement;
  }

  if (variant === 'horizontal') {
    return (
      <View style={styles.horizontalContainer}>
        {iconElement}
        <View style={styles.textBlockHorizontal}>
          <View style={styles.titleRow}>
            <Text style={[styles.titlePort, { color: isDark ? '#ffffff' : '#0f172a', fontSize: size * 0.44 }]}>
              Port
            </Text>
            <Text style={[styles.titleTrack, { fontSize: size * 0.44 }]}>
              Track
            </Text>
          </View>
          {showTagline && (
            <Text style={[styles.tagline, { fontSize: Math.max(9, size * 0.16) }]}>
              YATIRIM TAKİP PLATFORMU
            </Text>
          )}
        </View>
      </View>
    );
  }

  // Vertical (Stacked) Variant (Matching Image 1 & 2)
  return (
    <View style={styles.verticalContainer}>
      <View style={styles.iconWrapper}>{iconElement}</View>
      <View style={styles.titleRow}>
        <Text style={[styles.titlePort, { color: isDark ? '#ffffff' : '#0f172a', fontSize: size * 0.46 }]}>
          Port
        </Text>
        <Text style={[styles.titleTrack, { fontSize: size * 0.46 }]}>
          Track
        </Text>
      </View>
      {showTagline && (
        <Text style={[styles.tagline, { fontSize: Math.max(10, size * 0.18) }]}>
          Yatırım Takip Platformu
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  horizontalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  textBlockHorizontal: {
    justifyContent: 'center',
  },
  verticalContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titlePort: {
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  titleTrack: {
    fontWeight: '900',
    color: '#818cf8',
    letterSpacing: -0.5,
  },
  tagline: {
    color: '#94a3b8',
    fontWeight: '600',
    letterSpacing: 0.8,
    marginTop: 3,
  },
});
