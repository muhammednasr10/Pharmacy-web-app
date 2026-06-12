type StatCardProps = {
  title: string;
  value: string | number;
  colorClass?: string;
  onClick?: () => void;
};

export default function StatCard({ title, value, colorClass, onClick }: StatCardProps) {
  return (
    <div className={`statCard ${colorClass ?? ""}`} onClick={onClick}>
      <span>{title}</span>
      <strong>{value}</strong>
    </div>
  );
}
