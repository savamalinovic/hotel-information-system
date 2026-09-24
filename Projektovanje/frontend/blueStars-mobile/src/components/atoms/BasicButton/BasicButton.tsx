import { Button, ButtonText } from "@/src/components/ui/button";
import { useTheme } from "@/src/providers/ThemeProvider";

interface BasicButtonProps {
	title?: string;
	onPress: () => void;
	className?: string;
	textClassName?: string;
	disabled?: boolean;
}

export const BasicButton = ({
	title = "BasicButton",
	onPress,
	className,
	textClassName,
	disabled = false,
}: BasicButtonProps) => {

	const { Colors } = useTheme();

	return (
		<Button
			action="primary"
			variant="solid"
			size="lg"
			onPress={onPress}
			disabled={disabled}
			className={`w-[190px] h-[46px] rounded-[32px] justify-center items-center self-center bg-[rgb(var(--color-primary-500))] ${className ?? ""}`}
  			style={disabled ? { backgroundColor: Colors.disabledBackground } : undefined} // only override if disabled
		>
			<ButtonText className={`
					font-semibold
					${disabled ? "text-gray-500" : "text-white"}
					${textClassName ?? ""}
				`}>
				{title}
			</ButtonText>
		</Button>
	);
};
