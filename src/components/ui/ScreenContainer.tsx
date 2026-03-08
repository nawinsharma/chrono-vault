import React from 'react';
import { View, ScrollView, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** View that applies safe area insets via padding. Use instead of deprecated SafeAreaView. */
export function SafeScreenView({
  children,
  className,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: ViewStyle;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      className={className}
      style={[
        {
          flex: 1,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

interface ScreenContainerProps {
  children: React.ReactNode;
  scrollable?: boolean;
  padded?: boolean;
}

export function ScreenContainer({
  children,
  scrollable = false,
  padded = true,
}: ScreenContainerProps) {
  const insets = useSafeAreaInsets();
  const content = (
    <View className={`flex-1 ${padded ? 'px-5' : ''}`}>{children}</View>
  );

  return (
    <View
      className="flex-1 bg-vault-black"
      style={{
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
        paddingLeft: insets.left,
        paddingRight: insets.right,
      }}
    >
      {scrollable ? (
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1 }}
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </View>
  );
}
