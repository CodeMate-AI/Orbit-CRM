import { registerDecorator, ValidationArguments, ValidationOptions } from "class-validator";

export function IsValidPhone(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: "isValidPhone",
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (value === undefined || value === null || value === "") return true;
          if (typeof value !== "string") return false;

          const clean = value.replace(/\s+/g, "");

          if (clean.startsWith("+")) {
            return /^\+91\d{10}$/.test(clean);
          }

          if (clean.length === 12 && clean.startsWith("91")) {
            return /^91\d{10}$/.test(clean);
          }

          return /^\d{10}$/.test(clean);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid Indian phone number starting with +91 or 91, followed by exactly 10 digits.`;
        },
      },
    });
  };
}
