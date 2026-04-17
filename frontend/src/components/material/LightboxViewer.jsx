import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import Download from 'yet-another-react-lightbox/plugins/download';

export default function LightboxViewer({ images, index, onClose }) {
  const slides = images.map(m => ({
    src: `/files/${m.file_path}`,
    title: m.name,
    download: `/files/${m.file_path}`,
  }));

  return (
    <Lightbox
      open
      close={onClose}
      index={index}
      slides={slides}
      plugins={[Zoom, Download]}
      styles={{
        container: { backgroundColor: 'rgba(0,0,0,0.92)' },
      }}
      zoom={{ maxZoomPixelRatio: 5 }}
    />
  );
}
