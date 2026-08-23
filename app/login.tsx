import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuth, LoginMode } from '@/components/auth-provider';
import { StoreColors, StoreRadii } from '@/constants/store-theme';

export default function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string | string[]; redirect?: string | string[]; productId?: string | string[] }>();
  const initialMode = Array.isArray(params.mode) ? params.mode[0] : params.mode;
  const redirectParam = Array.isArray(params.redirect) ? params.redirect[0] : params.redirect;
  const productIdParam = Array.isArray(params.productId) ? params.productId[0] : params.productId;
  const [mode, setMode] = useState<LoginMode>(initialMode === 'admin' ? 'admin' : 'user');
  const [isRegistering, setIsRegistering] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, register } = useAuth();

  const safeRedirect = redirectParam === '/admin'
    || redirectParam === '/categories'
    || redirectParam === '/cart'
    || redirectParam === '/profile'
    || redirectParam === '/'
    || /^\/product\/\d+$/.test(redirectParam || '')
    ? redirectParam || '/'
    : '/';

  const switchMode = (nextMode: LoginMode) => {
    setMode(nextMode);
    setIsRegistering(false);
    setError('');
    setPassword('');
  };

  const submit = async () => {
    setIsSubmitting(true);
    setError('');
    try {
      if (mode === 'user' && isRegistering) {
        await register({ name, email, phone, password });
      } else {
        await login(identifier, password, mode);
      }
      if (mode === 'admin' && productIdParam) {
        router.replace({ pathname: '/admin', params: { productId: productIdParam } } as never);
      } else {
        const destination = mode === 'user' && safeRedirect === '/admin' ? '/' : safeRedirect;
        router.replace(destination as never);
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'ดำเนินการไม่สำเร็จ');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.page}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Ionicons name={mode === 'admin' ? 'shield-checkmark' : 'person'} size={42} color={StoreColors.jungleDark} />
          </View>
          <Text style={styles.title}>{mode === 'admin' ? 'เข้าสู่ระบบ Admin' : isRegistering ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ'}</Text>
          <Text style={styles.subtitle}>
            {mode === 'admin' ? 'สำหรับผู้ดูแลเพิ่ม แก้ไข และลบสินค้า' : 'ดูสินค้าได้โดยไม่ต้อง Login แต่ต้อง Login ก่อนซื้อสินค้า'}
          </Text>

          <View style={styles.modeRow}>
            <ModeButton label="User" active={mode === 'user'} onPress={() => switchMode('user')} />
            <ModeButton label="Admin" active={mode === 'admin'} onPress={() => switchMode('admin')} />
          </View>

          {mode === 'user' && isRegistering ? (
            <>
              <AuthInput label="ชื่อผู้ใช้" value={name} onChangeText={setName} placeholder="ใช้ชื่อนี้ Login ได้" />
              <AuthInput label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
              <AuthInput label="เบอร์โทรศัพท์ (10 หลัก)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={10} />
            </>
          ) : (
            <AuthInput
              label={mode === 'admin' ? 'ชื่อผู้ดูแลระบบ' : 'ชื่อผู้ใช้ หรือ Email'}
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
            />
          )}
          <AuthInput label="รหัสผ่าน" value={password} onChangeText={setPassword} secureTextEntry />

          {mode === 'user' && isRegistering && (
            <Text style={styles.passwordHint}>อย่างน้อย 8 ตัวอักษร และต้องมีตัวอักษรกับตัวเลข</Text>
          )}
          {!!error && <Text selectable style={styles.errorText}>{error}</Text>}

          <Pressable disabled={isSubmitting} onPress={submit} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, isSubmitting && styles.disabled]}>
            {isSubmitting ? <ActivityIndicator color={StoreColors.ink} /> : <Text style={styles.primaryButtonText}>{mode === 'user' && isRegistering ? 'สมัครและเข้าสู่ระบบ' : 'เข้าสู่ระบบ'}</Text>}
          </Pressable>

          {mode === 'user' && (
            <Pressable onPress={() => { setIsRegistering((value) => !value); setError(''); }} style={styles.secondaryButton}>
              <Text style={styles.secondaryText}>{isRegistering ? 'มีบัญชีอยู่แล้ว? เข้าสู่ระบบ' : 'ยังไม่มีบัญชี? สมัครสมาชิก'}</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function ModeButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.modeButton, active && styles.modeButtonActive, pressed && styles.pressed]}>
      <Text style={styles.modeButtonText}>{label}</Text>
    </Pressable>
  );
}

function AuthInput({ label, ...props }: { label: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput {...props} placeholderTextColor="#6B7C63" style={styles.input} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: StoreColors.mint },
  page: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 480, padding: 24, gap: 15, backgroundColor: StoreColors.white, borderWidth: 3, borderColor: StoreColors.ink, borderRadius: StoreRadii.large, borderCurve: 'continuous', boxShadow: `5px 5px 0 ${StoreColors.ink}` },
  iconCircle: { width: 78, height: 78, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', backgroundColor: StoreColors.electric, borderWidth: 2, borderColor: StoreColors.ink, borderRadius: StoreRadii.pill },
  title: { color: StoreColors.ink, fontSize: 29, fontWeight: '900', textAlign: 'center' },
  subtitle: { color: '#3C4B35', fontSize: 15, lineHeight: 22, textAlign: 'center' },
  modeRow: { flexDirection: 'row', gap: 10, paddingVertical: 2 },
  modeButton: { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center', backgroundColor: StoreColors.mintSoft, borderWidth: 2, borderColor: StoreColors.ink, borderRadius: StoreRadii.small },
  modeButtonActive: { backgroundColor: StoreColors.orange },
  modeButtonText: { color: StoreColors.ink, fontSize: 15, fontWeight: '900' },
  field: { gap: 7 },
  label: { color: StoreColors.ink, fontSize: 14, fontWeight: '800' },
  input: { minHeight: 48, color: StoreColors.ink, backgroundColor: StoreColors.mintSoft, borderWidth: 2, borderColor: StoreColors.ink, borderRadius: StoreRadii.small, borderCurve: 'continuous', paddingHorizontal: 13, fontSize: 16 },
  passwordHint: { color: StoreColors.jungle, fontSize: 12, fontWeight: '700' },
  errorText: { color: StoreColors.danger, fontSize: 14, lineHeight: 21, fontWeight: '700' },
  primaryButton: { minHeight: 50, alignItems: 'center', justifyContent: 'center', backgroundColor: StoreColors.electric, borderWidth: 2, borderColor: StoreColors.ink, borderRadius: StoreRadii.small, boxShadow: `3px 3px 0 ${StoreColors.ink}` },
  primaryButtonText: { color: StoreColors.ink, fontSize: 16, fontWeight: '900' },
  secondaryButton: { minHeight: 42, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: StoreColors.jungle, fontSize: 14, fontWeight: '800' },
  pressed: { opacity: 0.82, transform: [{ translateX: 2 }, { translateY: 2 }] },
  disabled: { opacity: 0.6 },
});
