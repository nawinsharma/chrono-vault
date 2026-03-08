import React, { useState } from 'react';
import { View, TextInput, Text, TextInputProps } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const AnimatedView = Animated.createAnimatedComponent(View);

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({ label, error, hint, ...props }: InputProps) {
  const [focused, setFocused] = useState(false);
  const borderOpacity = useSharedValue(0);

  const animatedBorder = useAnimatedStyle(() => ({
    borderColor: `rgba(139, 92, 246, ${borderOpacity.value})`,
  }));

  return (
    <View className="mb-4">
      {label && (
        <Text className="text-vault-muted text-sm mb-2 font-medium">
          {label}
        </Text>
      )}
      <AnimatedView
        style={[
          animatedBorder,
          { borderWidth: 1 },
        ]}
        className={`
          bg-vault-card rounded-xl px-4 py-3
          ${!focused ? 'border-vault-border' : ''}
          ${error ? 'border-red-500' : ''}
        `}
      >
        <TextInput
          placeholderTextColor="#6B7280"
          className="text-vault-white text-base"
          onFocus={() => {
            setFocused(true);
            borderOpacity.value = withTiming(1, { duration: 200 });
          }}
          onBlur={() => {
            setFocused(false);
            borderOpacity.value = withTiming(0, { duration: 200 });
          }}
          {...props}
        />
      </AnimatedView>
      {error && (
        <Text className="text-red-500 text-xs mt-1">{error}</Text>
      )}
      {hint && !error && (
        <Text className="text-vault-muted text-xs mt-1">{hint}</Text>
      )}
    </View>
  );
}
