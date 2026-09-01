import "../components/ui-next/styles.css";

export default function NewUiPreviewLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="ui-next">{children}</div>;
}
