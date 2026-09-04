import { VStack } from '@/src/components/ui/vstack';
import { useTheme } from '@/src/providers/ThemeProvider';
import React, { useRef } from 'react';
import {
    Dimensions,
    Image,
    ImageBackground,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';


interface AuthScreenTemplateProps {
  authForm: React.ReactNode;
  header?: React.ReactNode;
}

const AuthScreenTemplate = (props: AuthScreenTemplateProps) => {
  const { Colors } = useTheme();
  const windowHeight = Dimensions.get('window').height;
  const topImageHeight = windowHeight * 0.25;

  const scrollRef = useRef<ScrollView | null>(null);

  const defaultHeader = (
    <ImageBackground
      source={require('@/assets/images/background2.png')}
      style={{
        width: '100%',
        height: topImageHeight,
        justifyContent: 'center',
        alignItems: 'center',
      }}
      blurRadius={2}
    >
      <View
        style={{
          ...StyleSheet.absoluteFillObject,
          backgroundColor: 'rgba(0,0,0,0.20)',
        }}
      />
      <VStack className="items-center mt-12">
        <Image
          source={require('@/assets/images/lqlogo.png')}
          style={{ width: 120, height: 120, resizeMode: 'contain' }}
        />
      </VStack>
    </ImageBackground>
  );

  return (
    <SafeAreaView edges={["bottom"]} style={{ flex: 1, backgroundColor: Colors.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: Colors.background }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollRef}
          style={{ backgroundColor: Colors.background }}
          contentContainerStyle={{
            flexGrow: 1,
            backgroundColor: Colors.background,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={true}
          bounces={true}
        >
          {props.header || defaultHeader}

          <View
            className="w-full rounded-t-[30px] p-0"
            style={{
              marginTop: -30,
              backgroundColor: Colors.background,
              minHeight: windowHeight - topImageHeight + 30,
            }}
            pointerEvents="box-none"
          >
            <VStack space="lg" className="w-full pt-8 items-center">
              <View className="w-full mt-6">
                {props.authForm}
              </View>
            </VStack>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default AuthScreenTemplate;


/*
primjer upotrebe:
import React from 'react';
import AuthScreenTemplate from '../../src/components/templates/AuthScreenTemplate';

export default function IndexScreen() {
  const handleLogin = (data: any) => {
    console.log('Prijavljivanje korisnika:', data);
  };

  const handleRegister = (data: any) => {
    console.log('Registracija korisnika:', data);
  };

  const handleForgotPassword = () => {
    console.log('Zaboravljena lozinka');
  };

  const handleGoogleLogin = () => {
    console.log('Google login');
  };

  return (
    <AuthScreenTemplate
      onLogin={handleLogin}
      onRegister={handleRegister}
      onForgotPassword={handleForgotPassword}
      onGoogleLogin={handleGoogleLogin}
    />
  );
}

*/
