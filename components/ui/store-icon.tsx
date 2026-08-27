// Wrapper ของ Icon เพื่อกันปัญหา Static Export ก่อนหน้าเว็บ Hydrate
import { Ionicons } from '@expo/vector-icons';
import { ComponentProps, useEffect, useState } from 'react';
import { View } from 'react-native';

export type StoreIconName = ComponentProps<typeof Ionicons>['name'];

export function StoreIcon({ name, size, color }: {
  name: StoreIconName;
  size: number;
  color: string;
}) {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => setIsHydrated(true), []);

  // @expo/vector-icons renders an empty placeholder during static export.
  // Match that first browser render to avoid replacing the hydrated tree.
  if (!isHydrated) return <View style={{ width: size, height: size }} />;

  return <Ionicons name={name} size={size} color={color} />;
}
