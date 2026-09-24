import { useTheme } from "@/src/providers/ThemeProvider";
import { Control, Controller, FieldValues, Path } from "react-hook-form";
import { View } from "react-native";
import { HStack } from "../../ui/hstack";
import { CircleIcon } from "../../ui/icon";
import {
	Radio,
	RadioGroup,
	RadioIcon,
	RadioIndicator,
	RadioLabel,
} from "../../ui/radio";
import { VStack } from "../../ui/vstack";
import { Label } from "../Label/Label";

export interface RadioOption<T> {
	label: string;
	value: T;
	disabled?: boolean;
}

interface CustomRadioProps<TFieldValues extends FieldValues, TValue> {
	control: Control<TFieldValues>;
	name: Path<TFieldValues>;
	label?: string;
	options: RadioOption<TValue>[];
	disabled?: boolean;
	direction?: "row" | "column";
}

export default function CustomRadioGroup<TFieldValues, TValue>({
	control,
	name,
	label,
	options,
	disabled = false,
	direction = "row",
}: CustomRadioProps<TFieldValues, TValue>) {
	const { Colors } = useTheme();

	const Container = direction === "row" ? HStack : VStack;

	return (
		<Controller
			control={control}
			name={name}
			render={({ field: { value, onChange } }) => (
				<View style={{ gap: 12 }}>
					

					<RadioGroup
						value={String(value)}
						onChange={(val: string) => {
							const selected = options.find((opt) => String(opt.value) === val);
							if (selected) {
								onChange(selected.value);
							}
						}}
						isDisabled={disabled}
					>
						<Container space="md">
							{label && <Label text={label} size="lg" />}
							{options.map((opt) => (
								<Radio
									size="lg"
									key={String(opt.value)}
									value={String(opt.value)}
									isDisabled={disabled || opt.disabled}
								>
									<RadioIndicator style={{ borderColor: Colors.primary }}>
										{/* Mora className prvo pa onda fill/color, jer Gluestack override-uje naše stilove sa fill-none */}
										<RadioIcon
											as={CircleIcon}
											className="fill-blue-500"
											fill={Colors.primary}
											color={Colors.primary}
										/>
									</RadioIndicator>
									<RadioLabel>{opt.label}</RadioLabel>
								</Radio>
							))}
						</Container>
					</RadioGroup>
				</View>
			)}
		/>
	);
}
