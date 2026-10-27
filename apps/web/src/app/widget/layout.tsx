import { OfxEmbedBridge } from "@/components/shell/OfxEmbedBridge";

export default function WidgetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen w-screen m-0 p-0 overflow-hidden">
      <OfxEmbedBridge />
      {children}
    </div>
  );
}
