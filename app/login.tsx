// หน้า Login เดียวรองรับ User Login, User สมัครสมาชิก และ Admin Login
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';

import { LoginMode, useAuth } from '@/components/auth-provider';
import { StoreButton } from '@/components/ui/store-button';
import { StoreIcon } from '@/components/ui/store-icon';
import { StoreText } from '@/components/ui/store-text';
import { StoreColors, StoreFonts, StoreRadii, StoreShadows, StoreSpacing } from '@/constants/store-theme';

export default function LoginScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ mode?: string | string[]; redirect?: string | string[]; productId?: string | string[] }>();
  const initialMode = Array.isArray(params.mode) ? params.mode[0] : params.mode;
  const redirectParam = Array.isArray(params.redirect) ? params.redirect[0] : params.redirect;
  const productIdParam = Array.isArray(params.productId) ? params.productId[0] : params.productId;
  const { login, register } = useAuth();
  const [isHydrated, setIsHydrated] = useState(false);
  const [mode, setMode] = useState<LoginMode>(initialMode === 'admin' ? 'admin' : 'user');
  const [isRegistering, setIsRegistering] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isDesktop = isHydrated && width >= 920;

  useEffect(() => setIsHydrated(true), []);

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
    setShowPassword(false);
  };

  // ตรวจข้อมูลฝั่ง Client ก่อนส่ง API; กฎ password ผสมตัวอักษร/ตัวเลขใช้เฉพาะตอนสมัคร User
  const validate = () => {
    if (mode === 'user' && isRegistering) {
      if (name.trim().length < 2 || name.trim().length > 80) return 'ชื่อผู้ใช้ต้องมี 2-80 ตัวอักษร';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.trim().length > 190) return 'กรุณากรอก Email ให้ถูกต้อง';
      if (!/^0\d{9}$/.test(phone)) return 'เบอร์โทรศัพท์ต้องมี 10 หลักและขึ้นต้นด้วย 0';
      if (password.length < 8 || password.length > 256 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
        return 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร และมีทั้งตัวอักษรกับตัวเลข';
      }
    } else if (!identifier.trim()) {
      return mode === 'admin' ? 'กรุณากรอกชื่อผู้ดูแลระบบ' : 'กรุณากรอกชื่อผู้ใช้หรือ Email';
    } else if (!password || password.length > 256) {
      return 'กรุณากรอกรหัสผ่านให้ถูกต้อง';
    }
    return '';
  };

  // เลือก Endpoint ตามโหมด แล้วให้ AuthProvider เก็บ Session Token
  const submit = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setIsSubmitting(true);
    setError('');
    try {
      if (mode === 'user' && isRegistering) {
        await register({ name: name.trim(), email: email.trim().toLowerCase(), phone, password });
      } else {
        await login(identifier.trim(), password, mode);
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

  const title = mode === 'admin' ? 'เข้าสู่ระบบ Admin' : isRegistering ? 'สร้างบัญชีใหม่' : 'ยินดีต้อนรับกลับมา';

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: mode === 'admin' ? 'Admin Login' : isRegistering ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ', headerBackTitle: 'ร้านค้า' }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" contentContainerStyle={styles.page}>
        <View style={[styles.shell, isDesktop && styles.desktopShell]}>
          <View style={[styles.brandPanel, isDesktop && styles.desktopBrandPanel]}>
            <View style={styles.logo}><StoreIcon name="sparkles" size={28} color={StoreColors.text} /></View>
            <View style={styles.brandCopy}>
              <StoreText variant="display" style={[styles.brandTitle, !isDesktop && styles.mobileBrandTitle]}>PAN &amp; TOYS</StoreText>
              <StoreText variant="heading" style={styles.brandTagline}>Play outside the box</StoreText>
            </View>
            <StoreText style={styles.brandDescription}>โลกของเล่นสีสดสำหรับคนที่ชอบอะไรไม่เหมือนใคร ดูสินค้าได้ทันที และเข้าสู่ระบบเมื่อต้องการซื้อ</StoreText>
            {isDesktop && (
              <View style={styles.featureList}>
                <Feature icon="cart-outline" text="เก็บตะกร้าแยกตามบัญชี" />
                <Feature icon="receipt-outline" text="ดูประวัติคำสั่งซื้อจริง" />
                <Feature icon="navigate-outline" text="ติดตามสถานะการจัดส่ง" />
              </View>
            )}
          </View>

          <View style={styles.formPanel}>
            <View style={styles.formHeading}>
              <View style={styles.formIcon}><StoreIcon name={mode === 'admin' ? 'shield-checkmark-outline' : isRegistering ? 'person-add-outline' : 'person-outline'} size={30} color={StoreColors.primary} /></View>
              <StoreText variant="title" style={styles.formTitle}>{title}</StoreText>
              <StoreText style={styles.formSubtitle}>{mode === 'admin' ? 'สำหรับผู้ดูแลเพิ่ม แก้ไข และลบสินค้า' : isRegistering ? 'ใช้ข้อมูลจริงเพื่อสร้างบัญชีลูกค้า' : 'เข้าสู่ระบบก่อนเพิ่มสินค้าและสั่งซื้อ'}</StoreText>
            </View>

            <View accessibilityRole="tablist" style={styles.modeRow}>
              <ModeButton label="User" active={mode === 'user'} onPress={() => switchMode('user')} />
              <ModeButton label="Admin" active={mode === 'admin'} onPress={() => switchMode('admin')} />
            </View>

            <View style={styles.fields}>
              {mode === 'user' && isRegistering ? (
                <>
                  <AuthInput label="ชื่อผู้ใช้" icon="person-outline" value={name} onChangeText={setName} placeholder="2-80 ตัวอักษร" autoComplete="username-new" />
                  <AuthInput label="Email" icon="mail-outline" value={email} onChangeText={setEmail} placeholder="name@example.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
                  <AuthInput label="เบอร์โทรศัพท์" icon="call-outline" value={phone} onChangeText={(value) => setPhone(value.replace(/\D/g, '').slice(0, 10))} placeholder="0XXXXXXXXX" keyboardType="phone-pad" maxLength={10} autoComplete="tel" hint={`${phone.length}/10 หลัก`} />
                </>
              ) : (
                <AuthInput
                  label={mode === 'admin' ? 'ชื่อผู้ดูแลระบบ' : 'ชื่อผู้ใช้ หรือ Email'}
                  icon={mode === 'admin' ? 'shield-outline' : 'at-outline'}
                  value={identifier}
                  onChangeText={setIdentifier}
                  autoCapitalize="none"
                  autoComplete="username"
                />
              )}
              <AuthInput
                label="รหัสผ่าน"
                icon="lock-closed-outline"
                value={password}
                onChangeText={setPassword}
                maxLength={256}
                secureTextEntry={!showPassword}
                autoComplete={isRegistering ? 'new-password' : 'current-password'}
                rightAction={{ label: showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน', icon: showPassword ? 'eye-off-outline' : 'eye-outline', onPress: () => setShowPassword((value) => !value) }}
                hint={isRegistering ? 'อย่างน้อย 8 ตัวอักษร และมีตัวอักษรกับตัวเลข' : undefined}
                onSubmitEditing={() => void submit()}
              />
            </View>

            {!!error && (
              <View style={styles.errorCard}>
                <StoreIcon name="alert-circle-outline" size={20} color={StoreColors.danger} />
                <StoreText selectable variant="caption" style={styles.errorText}>{error}</StoreText>
              </View>
            )}

            <StoreButton
              title={mode === 'user' && isRegistering ? 'สมัครและเข้าสู่ระบบ' : 'เข้าสู่ระบบ'}
              icon={mode === 'user' && isRegistering ? 'person-add-outline' : 'log-in-outline'}
              size="lg"
              loading={isSubmitting}
              onPress={submit}
              style={styles.submitButton}
            />

            {mode === 'user' && (
              <StoreButton
                title={isRegistering ? 'มีบัญชีแล้ว? เข้าสู่ระบบ' : 'ยังไม่มีบัญชี? สมัครสมาชิก'}
                variant="ghost"
                onPress={() => { setIsRegistering((value) => !value); setError(''); setPassword(''); }}
              />
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Feature({ icon, text }: { icon: 'cart-outline' | 'receipt-outline' | 'navigate-outline'; text: string }) {
  return (
    <View style={styles.featureItem}>
      <View style={styles.featureIcon}><StoreIcon name={icon} size={19} color={StoreColors.primary} /></View>
      <StoreText variant="label">{text}</StoreText>
    </View>
  );
}

function ModeButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={onPress} style={({ pressed }) => [styles.modeButton, active && styles.modeButtonActive, pressed && styles.pressed]}>
      <StoreText variant="label" style={active && styles.modeLabelActive}>{label}</StoreText>
    </Pressable>
  );
}

function AuthInput({ label, icon, hint, rightAction, ...props }: {
  label: string;
  icon: 'person-outline' | 'mail-outline' | 'call-outline' | 'shield-outline' | 'at-outline' | 'lock-closed-outline';
  hint?: string;
  rightAction?: { label: string; icon: 'eye-outline' | 'eye-off-outline'; onPress: () => void };
} & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldLabelRow}>
        <StoreText variant="label">{label}</StoreText>
        {!!hint && <StoreText variant="caption">{hint}</StoreText>}
      </View>
      <View style={styles.inputShell}>
        <StoreIcon name={icon} size={19} color={StoreColors.textMuted} />
        <TextInput
          {...props}
          accessibilityLabel={label}
          placeholderTextColor={StoreColors.textMuted}
          style={styles.input}
          returnKeyType={props.secureTextEntry === undefined ? 'next' : 'done'}
        />
        {!!rightAction && (
          <Pressable accessibilityRole="button" accessibilityLabel={rightAction.label} hitSlop={8} onPress={rightAction.onPress}>
            <StoreIcon name={rightAction.icon} size={20} color={StoreColors.primary} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: StoreColors.background },
  page: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: StoreSpacing.md },
  shell: { width: '100%', maxWidth: 1080, overflow: 'hidden', backgroundColor: StoreColors.surface, borderWidth: 1, borderColor: '#D5E5DB', borderRadius: StoreRadii.large, borderCurve: 'continuous', boxShadow: StoreShadows.floating },
  desktopShell: { minHeight: 690, flexDirection: 'row' },
  brandPanel: { gap: StoreSpacing.md, padding: StoreSpacing.lg, backgroundColor: StoreColors.lavender },
  desktopBrandPanel: { width: '45%', justifyContent: 'center', padding: StoreSpacing.xxl },
  logo: { width: 58, height: 58, alignItems: 'center', justifyContent: 'center', backgroundColor: StoreColors.electric, borderRadius: StoreRadii.medium, transform: [{ rotate: '-5deg' }] },
  brandCopy: { gap: StoreSpacing.xxs },
  brandTitle: { color: StoreColors.primary, fontSize: 44 },
  mobileBrandTitle: { fontSize: 30, lineHeight: 38 },
  brandTagline: { color: StoreColors.primary },
  brandDescription: { maxWidth: 420, color: StoreColors.textMuted, fontSize: 16, lineHeight: 26 },
  featureList: { gap: StoreSpacing.sm, paddingTop: StoreSpacing.sm },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: StoreSpacing.sm },
  featureIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.68)', borderRadius: StoreRadii.pill },
  formPanel: { flex: 1, justifyContent: 'center', gap: StoreSpacing.md, padding: StoreSpacing.lg },
  formHeading: { alignItems: 'center', gap: StoreSpacing.xs },
  formIcon: { width: 68, height: 68, alignItems: 'center', justifyContent: 'center', backgroundColor: StoreColors.primarySoft, borderRadius: StoreRadii.pill },
  formTitle: { textAlign: 'center' },
  formSubtitle: { color: StoreColors.textMuted, textAlign: 'center' },
  modeRow: { flexDirection: 'row', gap: StoreSpacing.xs, padding: StoreSpacing.xxs, backgroundColor: StoreColors.surfaceAlt, borderRadius: StoreRadii.pill },
  modeButton: { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderRadius: StoreRadii.pill },
  modeButtonActive: { backgroundColor: StoreColors.surface, boxShadow: StoreShadows.card },
  modeLabelActive: { color: StoreColors.primary },
  fields: { gap: StoreSpacing.sm },
  field: { gap: StoreSpacing.xs },
  fieldLabelRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: StoreSpacing.xs },
  inputShell: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: StoreSpacing.xs, paddingHorizontal: StoreSpacing.sm, backgroundColor: StoreColors.surfaceAlt, borderWidth: 1, borderColor: '#C9DCD0', borderRadius: StoreRadii.medium, borderCurve: 'continuous' },
  input: { flex: 1, minWidth: 0, minHeight: 48, color: StoreColors.text, fontFamily: StoreFonts.body, fontSize: 15, paddingVertical: 0 },
  errorCard: { flexDirection: 'row', alignItems: 'flex-start', gap: StoreSpacing.xs, padding: StoreSpacing.sm, backgroundColor: '#FFF0F0', borderRadius: StoreRadii.medium, borderCurve: 'continuous' },
  errorText: { flex: 1, color: StoreColors.danger },
  submitButton: { width: '100%' },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
});
