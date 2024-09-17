import { forwardRef } from 'react';

type TextAreaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  errors?: string[];
  label: string;
};
const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ defaultValue, placeholder, label, errors, name }, ref) => {
    return (
      <div className="mb-4.5">
        <label className="mb-2.5 block text-black dark:text-white">{label}</label>
        <textarea
          ref={ref}
          name={name}
          rows={6}
          maxLength={2000}
          defaultValue={defaultValue}
          placeholder={placeholder}
          className={`${errors ? 'border-[#F87171]' : 'border-stroke dark:border-form-strokedark'} w-full rounded border-[1.5px] bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:bg-form-input dark:text-white dark:focus:border-primary `}
        ></textarea>
        {errors?.length && <p className="mt-2.5 text-[#CD5D5D]">{errors[0]}</p>}
      </div>
    );
  }
);

TextArea.displayName = 'TextArea';
export default TextArea;
