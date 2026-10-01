import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page">
      <section className="paper paper--plain" style={{ minHeight: "auto", marginTop: 40 }}>
        <h1>Sayfa bulunamadı</h1>
        <p>Aradığın tarif silinmiş ya da link hatalı olabilir.</p>
        <Link href="/defter" className="btn">
          Deftere dön
        </Link>
      </section>
    </main>
  );
}
