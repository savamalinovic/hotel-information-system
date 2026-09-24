import { Colors } from "@/src/styles/style";
import { ResetPasswordValidation } from "@/src/util/validationSchemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { TouchableOpacity, View } from "react-native";
import { BasicButton } from "../../atoms/BasicButton/BasicButton";
import InputOtp from "../../atoms/InputOtp/InputOtp";
import { Label } from "../../atoms/Label/Label";
import FormField from "../../molecules/FormField/FormField";
import Stepper, { CustomProgressStepProps } from "../../organisms/Stepper/Stepper";
import AuthScreenTemplate from "../../templates/AuthScreenTemplate/AuthScreenTemplate";
import { HStack } from "../../ui/hstack";
import { VStack } from "../../ui/vstack";
import { styles } from "./index.styles";
import { useEffect, useState } from "react";
import { toastService } from "@/src/services/toastService";
import { useAuth } from "@/src/hooks/useAuth";
import { OtpSendRequest, OtpVerifyRequest, ResetPasswordRequest } from "@/src/types/types";
import { LoginButton } from "../../atoms/LoginButton/LoginButton";
import { authService } from "@/src/api/services/authService";

export default function ForgotPasswordScreen() {
	const RESEND_OTP_SECONDS = 30;
	const { t } = useTranslation();
	const { resetPassword, isResettingPassword, resetPasswordError } = useAuth();
	const { control, handleSubmit, getValues, trigger, reset, formState: { errors } } = useForm<ResetPasswordValidation.FormValues>({
		resolver: zodResolver(ResetPasswordValidation.schema),
		defaultValues: {
			email: "",
			password: "",
			repeatPassword: ""
		},
	});
	const [activeStep, setActiveStep] = useState(0);


	const [resendTimer, setResendTimer] = useState(0);
	const [isResendDisabled, setIsResendDisabled] = useState(false);
	const [otpCode, setOtpCode] = useState("");

	useEffect(() => {
		if (resendTimer === 0) {
			setIsResendDisabled(false);
			return;
		}

		const interval = setInterval(() => {
			setResendTimer(prev => prev - 1);
		}, 1000);

		return () => clearInterval(interval);
	}, [resendTimer]);


	//#region HANDLERS
	const activateOtpTimeout = () => {
		setIsResendDisabled(true);
		setResendTimer(RESEND_OTP_SECONDS);
	}

	const sendOtpBase = async (onSuccess: () => void) => {
		const req: OtpSendRequest = { email: getValues("email") };
		try {
			const response = await authService.requestOtp(req);
			if(response.status === 400) {
				toastService.error(t('auth.errors.sendOtpEmailError'), t('auth.errors.verifyEmailError'));
				throw new Error("Error sending OTP, unverified email");
			}
			if(response.status !== 200 && response.status !== 400) {
				throw new Error("Error sending OTP");
			}

			onSuccess();
		} catch(err) {
			console.log(`OTP: ${err?.message}`)
			toastService.error(t('auth.errors.sendOtpEmailError'), t('auth.errors.verifyEmailError'));
		}
	}

	const onSendOtp = async () => {
		const isEmailValid = await trigger("email");

		if(!isEmailValid) {
			//toastService.error(t('auth.errors.sendOtpEmailError'));
			return;
		}

		sendOtpBase(() => setActiveStep(1));

		// Opcionalno ako odmah želimo timeout
		activateOtpTimeout();
	}

	const onVerifyOtp = async () => {
		if (otpCode.length !== 6) {
			toastService.error(t('auth.errors.enterValidOtpError'));
			return;
		}

		// Call backend verification here...
		console.log("Verifying OTP: ", otpCode);

		const req: OtpVerifyRequest = { email: getValues("email"), otp: otpCode };
		try {
			const response = await authService.verifyOtp(req);
			if(response.status !== 200) {
				throw new Error("Error verifying OTP");
			}

			toastService.success(t('auth.forgotPassword.otpVerified'));
			setActiveStep(2);
		} catch(err) {
			console.log(`OTP: ${err?.message}`);
			toastService.error(t('auth.errors.otpNotVerified'));
		}
	}

	const sendOtpAgain = () => {
		toastService.info(t('auth.forgotPassword.otpSentAgain'));

		// Calling backend resend OTP here...
		sendOtpBase(() => setActiveStep(1));

		activateOtpTimeout();
	}

	const onSubmit = (data: ResetPasswordValidation.FormValues) => {
		console.log(`Reset password data: ${JSON.stringify(data)}`);
		const request: ResetPasswordRequest = {
			email: data.email,
			newPassword: data.password,
			confirmPassword: data.repeatPassword,
			otp: otpCode
		}

		resetPassword(request);

		reset();
	}

	const onResetPassword = () => {
		handleSubmit(onSubmit)()
	}

	//#endregion


	//#region FORMS
	const sendOtpForm = (
		<VStack style={styles.root}>
			<VStack>
				<Label text={t('auth.forgotPassword.step1.title')} />
				<Label text={t('auth.forgotPassword.step1.subtitle')} size="sm" color={Colors.tertiary} />
			</VStack>
			
			<VStack style={styles.emailFormContainer}>
				<FormField control={control} name={"email"} label="Email" placeholder="marko.markovic@gmail.com" iconName="Mail" />
				<BasicButton title={t('auth.forgotPassword.step1.sendOtpButton')} onPress={onSendOtp} className="rounded-[10px] w-[100%]"  />
			</VStack>
		</VStack>
	);

	const verifyOtpForm = (
		<VStack style={styles.root}>
			<VStack>
				<Label text={t('auth.forgotPassword.step2.title')} />
				
			</VStack>

			<VStack style={styles.emailFormContainer}>
				<InputOtp onCompleteOtp={setOtpCode} />
				<BasicButton title={t('auth.forgotPassword.step2.verifyOtpButton')} onPress={onVerifyOtp} className="rounded-[10px] w-[100%]" disabled={otpCode.length !== 6} />
			</VStack>

			<HStack style={styles.sendOtpAgainContainer}>
				<Label text={t('auth.forgotPassword.step2.didntReceiveOtp')} size="sm" color={Colors.tertiary} />
				<TouchableOpacity
					onPress={sendOtpAgain}
					activeOpacity={0.4}
					disabled={isResendDisabled}
				>
					<Label
						size="sm"
						text={
							isResendDisabled
								? `${t('auth.forgotPassword.step2.resendOtp')} (${resendTimer}s)`
								: `${t('auth.forgotPassword.step2.resendOtp')}`
						}
						color={isResendDisabled ? Colors.tertiary : Colors.primary}
						className={isResendDisabled ? "" : "underline"}
					/>
				</TouchableOpacity>
			</HStack>
		</VStack>
	);

	const resetPasswordForm = (
		<VStack style={styles.root}>
			<VStack>
				<Label text={t('auth.forgotPassword.step3.title')} />
			</VStack>
			
			<VStack style={styles.emailFormContainer}>
				<FormField control={control} name={"password"} type="password" label={t('auth.forgotPassword.step3.newPasswordLabel')} placeholder="••••••••" iconName="Lock" helperText={t('auth.errors.passwordLengthError')} />
				<FormField control={control} name={"repeatPassword"} type="password" label={t('auth.forgotPassword.step3.confirmPasswordLabel')} placeholder="••••••••" iconName="Lock" helperText={t('auth.errors.passwordLengthError')} />
				
				<LoginButton
					title={t('auth.forgotPassword.step3.resetPasswordButton')}
					onPress={onResetPassword}
					className="mt-2"
					loadingTitle={t('auth.forgotPassword.loadingTitle')}
					isLoading={isResettingPassword}
				/>
			</VStack>
		</VStack>
	);
	//#endregion

	const STEPPER_CONFIG: CustomProgressStepProps[] = [
		{ label: t('auth.forgotPassword.step1.label'), buttonNextText: "Sljedeće", buttonPreviousText: "Nazad", componentToRender: sendOtpForm, onPreviousStep: () => setActiveStep(0), onNextStep: () => setActiveStep(1) },
		{ label: t('auth.forgotPassword.step2.label'), buttonNextText: "Sljedeće", buttonPreviousText: "Nazad", componentToRender: verifyOtpForm, onPreviousStep: () => setActiveStep(0), onNextStep: () => setActiveStep(2) },
		{ label: t('auth.forgotPassword.step3.label'), buttonNextText: "Sljedeće", buttonPreviousText: "Nazad", componentToRender: resetPasswordForm, onPreviousStep: () => setActiveStep(1), onNextStep: () => setActiveStep(2) }
	];

	const dynamicForm = (
		<View style={{flex: 1, }}>
			<Stepper progressSteps={STEPPER_CONFIG} activeStep={activeStep} />
		</View>
		
	);

	return (
		<AuthScreenTemplate authForm={dynamicForm} />
	);
}