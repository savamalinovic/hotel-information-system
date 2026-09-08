import {
	FormControl,
	FormControlError, FormControlErrorIcon, FormControlErrorText,
	FormControlHelper, FormControlHelperText
} from "@/src/components/ui/form-control";
import { LucideIconName } from "@/src/types/types";
import { AlertTriangleIcon } from "lucide-react-native";
import { useState } from "react";
import { TouchableOpacity } from "react-native";
import { Icon } from "../../atoms/Icon/Icon";
import LabeledTextField from "../LabeledTextField/LabeledTextField";
import { Control, Controller, FieldValues, Path } from "react-hook-form";

interface Props<T extends FieldValues> {
	name: Path<T>;
	control: Control<T>;
	rules?: object; // For validation rules
	required?: boolean;
	label: string;
	placeholder: string;
	iconName: LucideIconName;
	type?: "text" | "password";
	helperText?: string;
	errorText?: string;
	isInvalid?: boolean;
	rightElement?: React.ReactNode;
	size?: "sm" | "md" | "lg" | "xl";
	labelSize?:
	| "xs"
	| "sm"
	| "md"
	| "lg"
	| "xl"
	| "2xl"
	| "3xl"
	| "4xl"
	| "5xl"
	| "6xl";
	disabled?: boolean;
	formatValue?: (value: any) => string;
	inputProps?: any;
}

export default function FormField<T extends FieldValues>({
	name,
	control,
	rules,
	required,
	label,
	placeholder,
	iconName,
	type = "text",
	helperText,
	errorText,
	isInvalid = false,
	rightElement = null,
	size = "md",
	labelSize = "md",
	disabled = false,
	inputProps,

	formatValue,
}: Props<T>) {
	const [isPasswordVisible, setPasswordVisible] = useState(false);

	const isPasswordField = type === "password";

	return (
		<Controller 
			control={control}
			name={name}
			rules={rules}
			render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => {
				const displayValue = formatValue
					? formatValue(value)
					: value !== null && value !== undefined
						? String(value)   // <-- convert number to string
						: "";
				
				return (
					<FormControl isInvalid={!!error} isRequired size="md">
						<LabeledTextField
							label={label}
							labelSize={labelSize}
							placeholder={placeholder}
							required={required}
							size={size}
							iconLocation="left"
							iconName={iconName}
							value={displayValue}
							type={isPasswordField && !isPasswordVisible ? "password" : "text"}
							onChangeText={onChange}
							rightElement={
								isPasswordField ? (
									<TouchableOpacity
										onPress={() => setPasswordVisible(v => !v)}
										style={{ paddingRight: 8 }}
									>
										{isPasswordVisible ? (
											<Icon name="Eye" size={20} />
										) : (
											<Icon name="EyeOff" size={20} />
										)}
									</TouchableOpacity>
								) : rightElement
							}
							disabled={disabled}
							inputProps={inputProps}
						/>

						{helperText && (
							<FormControlHelper>
								<FormControlHelperText>{helperText}</FormControlHelperText>
							</FormControlHelper>
						)}

						{error  && (
							<FormControlError>
								<FormControlErrorIcon
									as={AlertTriangleIcon}
									className="text-red-500"
								>
								</FormControlErrorIcon>
								<FormControlErrorText className="text-red-500">
									{error.message}
								</FormControlErrorText>
							</FormControlError>
						)}
					</FormControl>
				);
				
			}}
		/>
	);
}