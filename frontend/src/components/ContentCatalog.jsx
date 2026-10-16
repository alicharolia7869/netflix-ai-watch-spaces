import React, { useState } from 'react';
import { 
  Play, 
  Users, 
  Search, 
  Sparkles, 
  Film, 
  Clock, 
  Star, 
  Layers, 
  Info, 
  X, 
  HelpCircle 
} from 'lucide-react';

function formatDuration(seconds) {
  const s = Math.max(0, Math.floor(seconds || 0));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins}m ${secs.toString().padStart(2, '0')}s`;
}

function formatTimestamp(seconds) {
  const s = Math.max(0, Math.floor(seconds || 0));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function ContentCatalog({
  catalog = [],
  recommendations = [],
  loading = false,
  error = null,
  onSelectMovie,
  onHostPartyForMovie,
}) {
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [detailsMovie, setDetailsMovie] = useState(null);

  const genres = ['All', 'Sci-Fi', 'Animation', 'Action', 'Drama', 'Comedy'];

  const featured = catalog.find((c) => c.featured) || catalog[0];

  const filteredMovies = catalog.filter((movie) => {
    const matchesGenre = selectedGenre === 'All' || (movie.genre || []).includes(selectedGenre);
    const matchesSearch = !searchQuery.trim() || 
      movie.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      movie.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesGenre && matchesSearch;
  });

  return (
    <div>
      {/* Featured Movie Hero Banner */}
      {featured && (
        <section style={{
          position: 'relative',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          marginBottom: '40px',
          minHeight: '380px',
          display: 'flex',
          alignItems: 'flex-end',
          padding: '40px',
          backgroundImage: `linear-gradient(180deg, rgba(11,11,13,0.2) 0%, rgba(11,11,13,0.92) 80%, rgba(11,11,13,1) 100%), url(${featured.thumbnailUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--color-border-subtle)'
        }}>
          <div style={{ maxWidth: '680px', zIndex: 10 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
              <span className="badge badge-primary">FEATURED SPOTLIGHT</span>
              <span style={{ fontSize: '0.8rem', color: '#FFB800', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Star size={14} fill="#FFB800" /> {featured.rating}
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                {featured.releaseYear} • {Math.floor(featured.duration / 60)} min
              </span>
              <span className="badge badge-secondary" style={{ fontSize: '0.7rem' }}>
                {featured.parentalRating || 'PG-13'}
              </span>
            </div>

            <h2 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '12px', lineHeight: 1.15 }}>
              {featured.title}
            </h2>

            <p style={{ color: 'var(--color-text-main)', fontSize: '1rem', lineHeight: 1.5, marginBottom: '24px' }}>
              {featured.description}
            </p>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                onClick={() => onSelectMovie(featured)}
                className="btn btn-primary"
                style={{ padding: '12px 24px', fontSize: '0.95rem' }}
              >
                <Play size={18} />
                Watch Now
              </button>
              <button
                onClick={() => onHostPartyForMovie(featured)}
                className="btn btn-secondary"
                style={{ padding: '12px 20px', fontSize: '0.95rem' }}
              >
                <Users size={18} />
                Host Watch Space
              </button>
              <button
                onClick={() => setDetailsMovie(featured)}
                className="btn btn-secondary"
                style={{ padding: '12px 18px', fontSize: '0.95rem' }}
              >
                <Info size={18} />
                Details
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Filter and Search Controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '28px'
      }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {genres.map((genre) => (
            <button
              key={genre}
              onClick={() => setSelectedGenre(genre)}
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.85rem',
                fontWeight: 600,
                background: selectedGenre === genre ? 'var(--color-primary)' : 'var(--color-bg-elevated)',
                color: selectedGenre === genre ? '#FFF' : 'var(--color-text-muted)',
                border: '1px solid var(--color-border-subtle)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {genre}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', minWidth: '260px' }}>
          <Search size={16} color="var(--color-text-muted)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search titles or descriptions..."
            style={{
              width: '100%',
              padding: '10px 14px 10px 38px',
              background: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border-subtle)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--color-text-bright)',
              fontSize: '0.85rem'
            }}
          />
        </div>
      </div>

      {/* Movie Catalog Grid Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
        <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Film size={20} color="var(--color-primary)" />
          Available Cinematic Works ({filteredMovies.length})
        </h3>
      </div>

      {loading ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '60px 0', color: 'var(--color-text-muted)' }}>
          <div className="spin-icon" style={{ display: 'inline-block', marginBottom: '12px' }}>
            <Film size={24} color="var(--color-primary)" />
          </div>
          <div>Loading movie catalog from API...</div>
        </div>
      ) : error ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '48px', color: '#FF5A5F' }}>
          <div style={{ fontWeight: 600, marginBottom: '6px' }}>Failed to load catalog</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{error}</div>
        </div>
      ) : filteredMovies.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '48px', color: 'var(--color-text-muted)' }}>
          No movies match your filter criteria.
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '24px',
          marginBottom: '50px'
        }}>
          {filteredMovies.map((movie) => (
            <div
              key={movie._id}
              className="glass-panel"
              style={{
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
            >
              {/* Thumbnail Card Banner */}
              <div style={{
                position: 'relative',
                height: '180px',
                backgroundImage: `url(${movie.thumbnailUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}>
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(180deg, transparent 40%, rgba(20,20,24,0.95) 100%)',
                }} />
                
                <div style={{ position: 'absolute', top: '12px', left: '12px', display: 'flex', gap: '6px' }}>
                  <span className="badge badge-primary">
                    {movie.rating}
                  </span>
                  {movie.featured && (
                    <span className="badge badge-secondary" style={{ color: '#FFB800' }}>
                      ★ Featured
                    </span>
                  )}
                </div>

                <span style={{
                  position: 'absolute',
                  bottom: '10px',
                  right: '12px',
                  background: 'rgba(0,0,0,0.7)',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <Clock size={12} /> {formatDuration(movie.duration)}
                </span>
              </div>

              {/* Movie Metadata Details */}
              <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <h4 style={{ fontSize: '1.2rem', margin: 0 }}>{movie.title}</h4>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    {movie.releaseYear}
                  </span>
                </div>

                <p style={{
                  fontSize: '0.85rem',
                  color: 'var(--color-text-muted)',
                  lineHeight: 1.5,
                  marginBottom: '16px',
                  flex: 1,
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>
                  {movie.description}
                </p>

                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '18px' }}>
                  {(movie.genre || []).map((g) => (
                    <span
                      key={g}
                      style={{
                        fontSize: '0.7rem',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: 'var(--color-bg-base)',
                        border: '1px solid var(--color-border-subtle)',
                        color: 'var(--color-text-main)',
                      }}
                    >
                      {g}
                    </span>
                  ))}
                  <span style={{
                    fontSize: '0.7rem',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: 'rgba(70, 211, 105, 0.1)',
                    color: 'var(--color-success)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <Layers size={10} /> {movie.scenes?.length || 0} Grounded Scenes
                  </span>
                </div>

                {/* Card Action Buttons (Watch, Details, Host Party) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '8px' }}>
                  <button
                    onClick={() => onSelectMovie(movie)}
                    className="btn btn-primary"
                    style={{ padding: '9px 10px', fontSize: '0.82rem' }}
                    title="Watch Solo Space"
                  >
                    <Play size={14} />
                    Watch
                  </button>
                  <button
                    onClick={() => setDetailsMovie(movie)}
                    className="btn btn-secondary"
                    style={{ padding: '9px 10px', fontSize: '0.82rem' }}
                    title="View Movie Details & Scenes"
                  >
                    <Info size={14} />
                    Details
                  </button>
                  <button
                    onClick={() => onHostPartyForMovie(movie)}
                    className="btn btn-secondary"
                    style={{ padding: '9px 10px', fontSize: '0.82rem' }}
                    title="Host Real-Time Watch Party"
                  >
                    <Users size={14} />
                    Host
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Personalized Recommendations Section */}
      {recommendations.length > 0 && (
        <section style={{ marginBottom: '40px' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sparkles size={20} color="#FFB800" />
            Recommended For You
          </h3>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '16px'
          }}>
            {recommendations.map((rec, i) => (
              <div
                key={i}
                className="glass-panel"
                style={{
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  cursor: 'pointer'
                }}
                onClick={() => setDetailsMovie(rec.content)}
              >
                <img
                  src={rec.content.thumbnailUrl}
                  alt={rec.content.title}
                  style={{ width: '80px', height: '60px', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '2px' }}>
                    {rec.content.title}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#FFB800', marginBottom: '4px' }}>
                    {rec.reason}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                    Match Score: {(rec.score * 10).toFixed(0)}% • {rec.content.genre?.join(', ')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Modal: Comprehensive Movie Details & Scene Breakdown */}
      {detailsMovie && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '20px'
        }}>
          <div className="glass-panel" style={{
            maxWidth: '740px',
            width: '100%',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-lg)'
          }}>
            {/* Header / Hero with Backdrop */}
            <div style={{
              position: 'relative',
              height: '220px',
              backgroundImage: `linear-gradient(180deg, rgba(11,11,13,0.3) 0%, rgba(11,11,13,0.95) 100%), url(${detailsMovie.thumbnailUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              display: 'flex',
              alignItems: 'flex-end',
              padding: '24px'
            }}>
              <button
                onClick={() => setDetailsMovie(null)}
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  background: 'rgba(0,0,0,0.6)',
                  border: '1px solid var(--color-border-subtle)',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-text-bright)',
                  cursor: 'pointer'
                }}
                aria-label="Close details"
              >
                <X size={18} />
              </button>

              <div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap' }}>
                  <span className="badge badge-primary">{detailsMovie.rating}</span>
                  <span className="badge badge-secondary">{detailsMovie.releaseYear}</span>
                  <span className="badge badge-secondary">{detailsMovie.parentalRating || 'PG-13'}</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={12} /> {formatDuration(detailsMovie.duration)}
                  </span>
                </div>
                <h3 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>{detailsMovie.title}</h3>
              </div>
            </div>

            {/* Scrollable Details Body */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h4 style={{ fontSize: '0.95rem', color: 'var(--color-text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Synopsis & Storyline
                </h4>
                <p style={{ color: 'var(--color-text-bright)', fontSize: '0.92rem', lineHeight: 1.6, margin: 0 }}>
                  {detailsMovie.description}
                </p>
              </div>

              {/* Genre Pills */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {(detailsMovie.genre || []).map((g) => (
                  <span
                    key={g}
                    style={{
                      background: 'var(--color-bg-base)',
                      border: '1px solid var(--color-border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '4px 10px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      color: 'var(--color-text-main)',
                    }}
                  >
                    {g}
                  </span>
                ))}
              </div>

              {/* Grounded Scene Breakdown */}
              {detailsMovie.scenes && detailsMovie.scenes.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '0.95rem', color: 'var(--color-text-muted)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <Layers size={16} color="var(--color-primary)" />
                    Timeline-Grounded Scene RAG Breakdown ({detailsMovie.scenes.length} Scenes)
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {detailsMovie.scenes.map((scene, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: 'var(--color-bg-base)',
                          border: '1px solid var(--color-border-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '12px 14px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--color-text-bright)' }}>
                            {scene.title}
                          </span>
                          <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#46D369', background: 'rgba(70,211,105,0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                            {formatTimestamp(scene.startTime)} - {formatTimestamp(scene.endTime)}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '0 0 6px 0', lineHeight: 1.4 }}>
                          {scene.summary}
                        </p>
                        {scene.characters && scene.characters.length > 0 && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                            <strong>Characters: </strong> {scene.characters.join(', ')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Contextual Trivia Preview */}
              {detailsMovie.trivia && detailsMovie.trivia.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '0.95rem', color: 'var(--color-text-muted)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <HelpCircle size={16} color="#FFB800" />
                    Contextual Production Trivia
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {detailsMovie.trivia.slice(0, 2).map((t, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: 'rgba(255, 184, 0, 0.05)',
                          border: '1px solid rgba(255, 184, 0, 0.2)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '10px 12px',
                          fontSize: '0.82rem',
                          color: 'var(--color-text-main)'
                        }}
                      >
                        <span style={{ fontWeight: 600, color: '#FFB800', marginRight: '6px' }}>
                          [{t.category}]:
                        </span>
                        {t.fact}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Modal Action Controls */}
            <div style={{
              borderTop: '1px solid var(--color-border-subtle)',
              padding: '16px 24px',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              background: 'var(--color-bg-base)'
            }}>
              <button
                onClick={() => setDetailsMovie(null)}
                className="btn btn-secondary"
                style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              >
                Close
              </button>
              <button
                onClick={() => {
                  const m = detailsMovie;
                  setDetailsMovie(null);
                  onSelectMovie(m);
                }}
                className="btn btn-secondary"
                style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              >
                <Play size={15} />
                Watch Solo
              </button>
              <button
                onClick={() => {
                  const m = detailsMovie;
                  setDetailsMovie(null);
                  onHostPartyForMovie(m);
                }}
                className="btn btn-primary"
                style={{ padding: '8px 20px', fontSize: '0.85rem' }}
              >
                <Users size={15} />
                Host Watch Space
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
