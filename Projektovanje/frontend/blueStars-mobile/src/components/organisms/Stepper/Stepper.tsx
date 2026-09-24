import { useTheme } from "@/src/providers/ThemeProvider";
import { ProgressStep, ProgressSteps } from "react-native-progress-steps";

export interface CustomProgressStepProps {
	label: string;
	buttonNextText?: string;
	buttonPreviousText?: string;
	buttonNextTextColor?: string;
	buttonPreviousTextColor?: string;
	componentToRender?: React.ReactNode;

	onNextStep?: () => void;
	onPreviousStep?: () => void;
}

interface StepperProps {
	progressSteps: CustomProgressStepProps[];
	activeStep: number;
}

export default function Stepper(props: StepperProps) {
	const { Colors } = useTheme();

	return (
		<ProgressSteps 
			completedCheckColor={"#FFFFFF"}

			activeLabelColor={Colors.primary}
			activeStepNumColor={Colors.textPrimary} 
			activeStepIconBorderColor={Colors.primary}

			completedProgressBarColor={Colors.statusAvailable}
			completedStepIconColor={Colors.statusAvailable}
			completedLabelColor={Colors.statusAvailable}
			
			disabledStepIconColor={Colors.disabledBackground}
			disabledStepNumColor={Colors.tertiary}
			activeStep={props.activeStep}
		>
			{props.progressSteps.map((step, index) => {
				return(
					<ProgressStep 
						key={index} 
						label={step.label} 
						buttonPreviousText={step.buttonPreviousText} 
						buttonPreviousTextColor={Colors.tertiary}
						onPrevious={step.onPreviousStep}
						buttonNextText={step.buttonNextText} 
						buttonNextTextColor={Colors.background} // TODO: Find better workaround to hide it
						buttonNextDisabled={true}
						onNext={step.onNextStep}
					>
						{step.componentToRender}
					</ProgressStep>
				);
			})}
		</ProgressSteps>
	);
}