import ButtonProps from './ButtonProps';

const PrimaryButton = ({ action, label }: ButtonProps) => {
  return (
    <button
      onClick={action}
      className="inline-flex items-center justify-center rounded-full bg-primary py-4 px-10 text-center font-medium text-white hover:bg-opacity-90 lg:px-8 xl:px-10"
    >
      {label}
    </button>
  );
};

export default PrimaryButton;
