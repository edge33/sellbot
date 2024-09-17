import { forwardRef } from 'react';

type TextInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  errors?: string[];
  label: string;
  required: boolean;
};

const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  ({ defaultValue, type, placeholder, label, errors, name, required }, ref) => {
    return (
      <div className="mb-4.5">
        <label className="mb-2.5 block text-black dark:text-white">
          {label} {required && <span className="text-meta-1">*</span>}
        </label>
        <input
          ref={ref}
          name={name}
          defaultValue={defaultValue}
          type={type}
          placeholder={placeholder}
          className={`${errors ? 'border-[#F87171]' : 'border-stroke dark:border-form-strokedark'} w-full rounded border-[1.5px] bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter  dark:bg-form-input dark:text-white dark:focus:border-primary`}
        />
        {errors?.length && <p className="mt-2.5 text-[#CD5D5D]">{errors[0]}</p>}
      </div>
    );
  }
);

TextInput.displayName = 'TextInput';
export default TextInput;
