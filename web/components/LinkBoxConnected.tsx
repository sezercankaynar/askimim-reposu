"use client";

import LinkBox from "./LinkBox";

/** 6. aşamada import işi oluşturan sunucu eylemine bağlanır. */
export default function LinkBoxConnected() {
  return (
    <LinkBox
      onSubmit={async () => "Linkten tarif ekleme özelliği bir sonraki aşamada açılacak. Şimdilik elle tarif ekleyebilirsiniz."}
    />
  );
}
