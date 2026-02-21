/**
 * RunwayBanner — full-width animated runway strip.
 *
 * GIF options (swap src to switch):
 *   Alaska Airlines (real footage, dark):  media.giphy.com/media/l49JXNwyvjgWuiM6Y/giphy.gif  ← current
 *   Delta Air Lines (real footage, square): media.giphy.com/media/ei4juXBXLJuc2gBCgg/giphy.gif
 *
 * A semi-transparent dark overlay on top blends any GIF into the dark page.
 */
export default function RunwayBanner() {
  return (
    <div
      className="relative w-full overflow-hidden select-none"
      style={{ height: '100px' }}
      aria-hidden="true"
    >
      {/* GIF fills the full banner */}
      <img
        src="https://media.giphy.com/media/l49JNg634XknnaCvC/giphy.gif"
        alt="Plane taking off"
        style={{
          width: '50%',
          height: '50%',
          objectFit: 'cover',
          objectPosition: 'center',
          display: 'block',
        }}
      />

      {/* Dark gradient overlay — top & bottom edges fade into page background,
          keeps the GIF from clashing with the dark page above/below */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(to bottom, #080808 0%, transparent 25%, transparent 75%, #080808 100%)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}
