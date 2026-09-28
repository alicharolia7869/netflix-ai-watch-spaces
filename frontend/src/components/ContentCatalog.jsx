import React, { useState } from 'react';
import { Play, Users, Search, Sparkles, Film, Clock, Star, Layers } from 'lucide-react';

export function ContentCatalog({
  catalog = [],
  recommendations = [],
  loading = false,
  onSelectMovie,
  onHostPartyForMovie,
}) {
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

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
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <span className="badge badge-primary">FEATURED SPOTLIGHT</span>
              <span style={{ fontSize: '0.8rem', color: '#FFB800', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Star size={14} fill="#FFB800" /> {featured.rating}
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                {featured.releaseYear} • {Math.floor(featured.duration / 60)} min
              </span>
            </div>

            <h2 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '12px', lineHeight: 1.15 }}>
              {featured.title}
            </h2>

            <p style={{ color: 'var(--color-text-main)', fontSize: '1rem', lineHeight: 1.5, marginBottom: '24px' }}>
              {featured.description}
            </p>

            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
              <button
                onClick={() => onHostPartyForMovie(featured)}
                className="btn btn-primary"
                style={{ padding: '12px 24px', fontSize: '0.95rem' }}
              >
                <Users size={18} />
                Host Watch Space
              </button>
              <button
                onClick={() => onSelectMovie(featured)}
                className="btn btn-secondary"
                style={{ padding: '12px 20px', fontSize: '0.95rem' }}
              >
                <Play size={18} />
                Preview Solo
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

      {/* Movie Catalog Grid */}
      <h3 style={{ fontSize: '1.25rem', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Film size={20} color="var(--color-primary)" />
        Available Licensed Titles ({filteredMovies.length})
      </h3>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--color-text-muted)' }}>
          Loading catalog...
        </div>
      ) : filteredMovies.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '48px', color: 'var(--color-text-muted)' }}>
          No content matches your filter criteria.
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
                <span className="badge badge-primary" style={{ position: 'absolute', top: '12px', left: '12px' }}>
                  {movie.rating}
                </span>
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
                  <Clock size={12} /> {Math.floor(movie.duration / 60)}m {movie.duration % 60}s
                </span>
              </div>

              <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <h4 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>{movie.title}</h4>
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

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => onHostPartyForMovie(movie)}
                    className="btn btn-primary"
                    style={{ flex: 1, padding: '10px', fontSize: '0.85rem' }}
                  >
                    <Users size={14} />
                    Host Party
                  </button>
                  <button
                    onClick={() => onSelectMovie(movie)}
                    className="btn btn-secondary"
                    style={{ padding: '10px 14px', fontSize: '0.85rem' }}
                  >
                    <Play size={14} />
                    Watch
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
                onClick={() => onHostPartyForMovie(rec.content)}
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
    </div>
  );
}
