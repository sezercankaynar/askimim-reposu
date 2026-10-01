"""Hata kodları ve kullanıcıya gösterilen Türkçe mesajlar."""
from __future__ import annotations


class ImportError_(Exception):
    """Kullanıcıya gösterilecek, kodlu hata."""

    def __init__(self, code: str, detail: str | None = None, retryable: bool = False):
        self.code = code
        self.detail = detail
        self.retryable = retryable
        super().__init__(f"{code}: {detail or ''}")

    @property
    def message(self) -> str:
        return MESSAGES.get(self.code, MESSAGES["UNKNOWN"])


MESSAGES: dict[str, str] = {
    "INVALID_URL": "Bu bir link gibi görünmüyor. http:// veya https:// ile başlayan tam linki yapıştırın.",
    "BLOCKED_URL": "Bu adrese güvenlik nedeniyle erişilemiyor. Herkese açık bir link kullanın.",
    "UNSUPPORTED_PLATFORM": "Bu site desteklenmiyor. Instagram, TikTok, YouTube, Pinterest veya bir tarif sitesi linki deneyin.",
    "FETCH_FAILED": "Sayfa açılamadı. Link doğru mu kontrol edin, biraz sonra tekrar deneyin.",
    "NO_RECIPE_FOUND": "Bu içerikte bir tarif bulunamadı. Malzeme ve adımların yazılı ya da anlatıldığı bir içerik seçin.",
    "VIDEO_TOO_LONG": "Video 10 dakikadan uzun. Daha kısa bir video deneyin ya da tarifi elle ekleyin.",
    "VIDEO_TOO_LARGE": "Video dosyası çok büyük (200 MB üstü). Daha kısa bir video deneyin.",
    "DOWNLOAD_FAILED": "Video indirilemedi. Link herkese açık mı kontrol edin; sorun sürerse ekran görüntüsü yükleyin.",
    "INSTAGRAM_LOGIN_REQUIRED": "Instagram bu içerik için giriş istiyor. Gönderinin ekran görüntülerini yükleyerek ekleyebilirsiniz.",
    "PRIVATE_CONTENT": "Bu içerik gizli ya da kaldırılmış. Herkese açık bir gönderi deneyin.",
    "TRANSCRIBE_FAILED": "Ses yazıya dökülemedi. Birkaç dakika sonra tekrar deneyin.",
    "LLM_FAILED": "Tarif yazılırken bir sorun oldu. Birkaç dakika sonra tekrar deneyin.",
    "DAILY_LIMIT": "Bugünlük link ekleme hakkınız doldu. Yarın tekrar deneyin ya da tarifi elle ekleyin.",
    "DUPLICATE": "Bu link zaten defterinizde var.",
    "STALE": "İşlem birkaç kez yarıda kaldı. Linki tekrar ekleyip deneyin.",
    "NOT_IMPLEMENTED": "Bu özellik henüz hazır değil.",
    "UNKNOWN": "Beklenmeyen bir sorun oldu. Linki tekrar ekleyip deneyin; sorun sürerse tarifi elle ekleyin.",
}
