import styles from './tootltip.module.css';

type TooltipProps = {
  text: string;
  children: React.ReactElement;
};

const Tooltip = ({ text, children }: TooltipProps) => {
  return (
    <div className={styles.tooltip}>
      {children}
      <span className={styles.tooltiptext}>{text}</span>
    </div>
  );
};

export default Tooltip;
