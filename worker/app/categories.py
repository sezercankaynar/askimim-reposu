"""Sabit kategori listesi. web/lib/categories.ts ile birebir aynı tutulur."""

CATEGORIES: dict[str, list[str]] = {
    "Çorbalar": ["Sebze çorbaları", "Bakliyat çorbaları", "Et & tavuk çorbaları", "Terbiyeli çorbalar"],
    "Ana Yemekler": ["Et yemekleri", "Tavuk yemekleri", "Balık & deniz ürünleri", "Köfteler", "Güveç & fırın"],
    "Sebze Yemekleri": ["Zeytinyağlılar", "Etli sebze yemekleri", "Dolma & sarma", "Bakliyat yemekleri"],
    "Pilav & Makarna": ["Pilavlar", "Makarnalar", "Bulgur", "Noodle & Asya"],
    "Hamur İşleri": ["Börekler", "Poğaça & açma", "Ekmekler", "Pide & lahmacun", "Mantı"],
    "Kahvaltılıklar": ["Yumurtalı", "Menemen & sahanlar", "Krep & pankek", "Reçel & ezme"],
    "Salatalar & Mezeler": ["Salatalar", "Mezeler", "Soslar & dipler", "Turşular"],
    "Tatlılar": ["Şerbetli tatlılar", "Sütlü tatlılar", "Kekler & kurabiyeler", "Pastalar", "Dondurma & meyveli"],
    "Atıştırmalıklar": ["Kızartmalar", "Sandviç & tost", "Burger & wrap", "Aperatifler"],
    "İçecekler": ["Sıcak içecekler", "Soğuk içecekler", "Smoothie", "Limonata & şerbet"],
    "Diğer": ["Bebek & çocuk", "Diyet & fit", "Vegan", "Dünya mutfağı", "Pratik"],
}

CATEGORY_NAMES = list(CATEGORIES.keys())
ALL_SUBCATEGORIES = [s for subs in CATEGORIES.values() for s in subs]
