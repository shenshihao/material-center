import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import Download from 'yet-another-react-lightbox/plugins/download';
import Counter from 'yet-another-react-lightbox/plugins/counter';
import Captions from 'yet-another-react-lightbox/plugins/captions';
import Slideshow from 'yet-another-react-lightbox/plugins/slideshow';
import Thumbnails from 'yet-another-react-lightbox/plugins/thumbnails';
import 'yet-another-react-lightbox/plugins/captions.css';
import 'yet-another-react-lightbox/plugins/thumbnails.css';

function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

export default function LightboxViewer({ images, index, onClose }) {
  const slides = images.map(m => ({
    src: `/files/${m.file_path}`,
    title: m.name,
    description: [
      m.category_name ? `📁 ${m.category_name}` : null,
      formatSize(m.file_size) ? `📦 ${formatSize(m.file_size)}` : null,
      m.width && m.height ? `📐 ${m.width} × ${m.height}` : null,
      m.created_at ? `🕐 ${new Date(m.created_at).toLocaleDateString('zh-CN')}` : null,
    ].filter(Boolean).join('  ·  '),
    download: `/files/${m.file_path}`,
  }));

  return (
    <Lightbox
      open
      close={onClose}
      index={index}
      slides={slides}
      plugins={[Zoom, Download, Counter, Captions, Slideshow, Thumbnails]}
      styles={{
        container: {
          backgroundColor: 'rgba(3, 0, 18, 0.98)',
          backdropFilter: 'blur(20px)',
        },
        button: {
          backgroundColor: 'rgba(26, 21, 48, 0.8)',
          border: '1px solid rgba(0, 245, 212, 0.2)',
          color: '#f8f4ff',
        },
        buttonHover: {
          backgroundColor: 'rgba(0, 245, 212, 0.15)',
          border: '1px solid rgba(0, 245, 212, 0.4)',
        },
        counter: {
          backgroundColor: 'rgba(26, 21, 48, 0.8)',
          border: '1px solid rgba(0, 245, 212, 0.2)',
          color: '#c4b8db',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '12px',
        },
        navigation: {
          backgroundColor: 'rgba(26, 21, 48, 0.8)',
          border: '1px solid rgba(0, 245, 212, 0.2)',
        },
        thumbnails: {
          backgroundColor: 'rgba(26, 21, 48, 0.6)',
          borderTop: '1px solid rgba(0, 245, 212, 0.15)',
        },
        thumbnail: {
          backgroundColor: 'transparent',
          border: '1px solid transparent',
        },
        thumbnailActive: {
          border: '1px solid rgba(0, 245, 212, 0.6)',
        },
      }}
      captions={{ showToggle: true }}
      thumbnails={{ position: 'bottom', width: 80, height: 80 }}
      zoom={{ maxZoomPixelRatio: 5 }}
      counter={{ container: { top: '16px', left: '50%', transform: 'translateX(-50%)' } }}
      slideshow={{ autoplay: false, restartDelay: 3000 }}
      animation={{ zoom: 400, slide: 300 }}
      transition={{ duration: 0.3 }}
    />
  );
}
