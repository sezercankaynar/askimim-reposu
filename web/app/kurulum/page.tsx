export default function SetupPage() {
  return (
    <main className="page">
      <section className="paper paper--plain">
        <h1>Kurulum gerekli</h1>
        <p>
          Supabase bağlantı bilgileri henüz girilmemiş. <code>web/.env.example</code> dosyasını <code>.env.local</code> olarak
          kopyalayıp <code>NEXT_PUBLIC_SUPABASE_URL</code> ve <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> değerlerini doldurun.
        </p>
        <p>Adım adım anlatım için README dosyasındaki &quot;Kurulum&quot; bölümüne bakın.</p>
      </section>
    </main>
  );
}
