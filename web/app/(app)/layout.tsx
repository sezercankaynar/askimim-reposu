import TabBar from "@/components/TabBar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="page">{children}</div>
      <TabBar />
    </>
  );
}
