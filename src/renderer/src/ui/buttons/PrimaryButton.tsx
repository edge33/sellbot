import ButtonProps from './ButtonProps';

const PrimaryButton = ({ action, label, disabled }: ButtonProps) => {
  return (
    <button
      onClick={action}
      disabled={disabled}
      className={`inline-flex items-center justify-center rounded-full py-4 px-10 text-center font-medium text-white lg:px-8 xl:px-10 transition-opacity ${
        disabled ? 'bg-meta-3 opacity-50 cursor-not-allowed' : 'bg-meta-3 hover:bg-opacity-90'
      }`}
    >
      {label}
    </button>
  );
};

export default PrimaryButton;
