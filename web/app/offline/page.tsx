import Link from "next/link";

export default function OfflinePage() {
  return (
    <main className="page">
      <section className="paper paper--plain" style={{ minHeight: "auto", marginTop: 40 }}>
        <h1>Çevrimdışısın</h1>
        <p>Bu sayfa daha önce açılmadığı için önbellekte yok. Daha önce açtığın tarifler internet olmadan da okunabilir.</p>
        <Link href="/defter" className="btn">
          Deftere dön
        </Link>
      </section>
    </main>
  );
}
