import React, { useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Platform, SafeAreaView,
} from 'react-native';
import {
  PhoneAuthProvider, signInWithCredential,
  signInWithPhoneNumber, RecaptchaVerifier,
} from 'firebase/auth';
import { auth, firebaseConfig } from './firebaseConfig';

const isWeb = Platform.OS === 'web';
const RecaptchaModal = isWeb
  ? null
  : require('expo-firebase-recaptcha').FirebaseRecaptchaVerifierModal;

export default function App() {
  const recaptchaRef = useRef(null);
  const confirmationRef = useRef(null); // web
  const [phone, setPhone] = useState('+92');
  const [code, setCode] = useState('');
  const [verificationId, setVerificationId] = useState(null); // native
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null); // {type, text}

  const sendOtp = async () => {
    setMsg(null);
    if (!/^\+\d{10,15}$/.test(phone)) {
      return setMsg({ type: 'error', text: 'Number country code ke sath likho, e.g. +923001234567' });
    }
    try {
      setLoading(true);
      if (isWeb) {
        if (!window.recaptchaVerifier) {
          const div = document.createElement('div');
          document.body.appendChild(div);
          window.recaptchaVerifier = new RecaptchaVerifier(auth, div, { size: 'invisible' });
        }
        confirmationRef.current = await signInWithPhoneNumber(auth, phone, window.recaptchaVerifier);
      } else {
        const provider = new PhoneAuthProvider(auth);
        const id = await provider.verifyPhoneNumber(phone, recaptchaRef.current);
        setVerificationId(id);
      }
      setOtpSent(true);
      setMsg({ type: 'success', text: 'OTP bhej diya gaya hai ✔' });
    } catch (e) {
      setMsg({ type: 'error', text: 'OTP send failed: ' + e.message });
      if (isWeb && window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    setMsg(null);
    if (code.length !== 6) return setMsg({ type: 'error', text: '6 digit OTP likho' });
    try {
      setLoading(true);
      if (isWeb) {
        await confirmationRef.current.confirm(code);
      } else {
        const cred = PhoneAuthProvider.credential(verificationId, code);
        await signInWithCredential(auth, cred);
      }
      setMsg({ type: 'success', text: '✅ Verification Successful! Phone number verified.' });
    } catch (e) {
      setMsg({ type: 'error', text: '❌ Verification Failed: Invalid ya expired OTP.' });
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setOtpSent(false); setCode(''); setMsg(null); setVerificationId(null);
  };

  return (
    <SafeAreaView style={s.container}>
      {!isWeb && (
        <RecaptchaModal
          ref={recaptchaRef}
          firebaseConfig={firebaseConfig}
          attemptInvisibleVerification
        />
      )}
      <Text style={s.title}>Phone OTP Verification</Text>

      {!otpSent ? (
        <>
          <TextInput
            style={s.input} value={phone} onChangeText={setPhone}
            keyboardType="phone-pad" placeholder="+923001234567"
          />
          <TouchableOpacity style={s.btn} onPress={sendOtp} disabled={loading}>
            <Text style={s.btnText}>Send OTP</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={s.hint}>OTP bheja gaya: {phone}</Text>
          <TextInput
            style={s.input} value={code} onChangeText={setCode}
            keyboardType="number-pad" maxLength={6} placeholder="6-digit OTP"
          />
          <TouchableOpacity style={s.btn} onPress={verifyOtp} disabled={loading}>
            <Text style={s.btnText}>Verify OTP</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={reset}>
            <Text style={s.link}>Number change karo / Resend</Text>
          </TouchableOpacity>
        </>
      )}

      {loading && <ActivityIndicator style={{ marginTop: 16 }} size="large" />}
      {msg && (
        <Text style={[s.msg, { color: msg.type === 'success' ? 'green' : 'red' }]}>
          {msg.text}
        </Text>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 24 },
  input: { borderWidth: 1, borderColor: '#bbb', borderRadius: 8, padding: 12, fontSize: 18, marginBottom: 12 },
  btn: { backgroundColor: '#4f46e5', padding: 14, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  hint: { textAlign: 'center', marginBottom: 12, color: '#555' },
  link: { color: '#4f46e5', textAlign: 'center', marginTop: 16 },
  msg: { textAlign: 'center', marginTop: 20, fontSize: 16, fontWeight: '600' },
});