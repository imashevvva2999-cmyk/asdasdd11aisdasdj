import { ScreenPlaceholder } from '@/components/dev/screen-placeholder';

/**
 * S-28 Upload Track — UF-14 step 4. File picker/form/progress/success/error UI
 * only per current scope — no real server upload. Publishing states beyond the
 * base form are undefined by design (OQ-50).
 */
export default function UploadTrackScreen() {
  return (
    <ScreenPlaceholder
      screenId="S-28"
      title="Upload Track"
      note="Upload Audio, Track Details, Cover Artwork, Release Settings, Publish/Save as Draft — docs/screens.md (Фаза 4, UF-14). Publishing states (uploading/processing/error) are not yet specified by design — see OQ-50."
    />
  );
}
