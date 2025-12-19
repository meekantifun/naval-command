import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './MapManager.css';

function MapManager({ guildId }) {
  const [maps, setMaps] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMaps();
  }, [guildId]);

  const loadMaps = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/admin/maps', {
        withCredentials: true
      });
      setMaps(response.data.maps || []);
      setTemplates(response.data.templates || []);
    } catch (error) {
      console.error('Error loading maps:', error);
      alert('Failed to load maps');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading maps...</div>;
  }

  return (
    <div className="map-manager">
      <div className="manager-section">
        <h3>Map Templates ({templates.length})</h3>
        <p className="section-desc">Pre-built map templates you can use for games</p>
        <div className="map-list">
          {templates.map((template) => (
            <div key={template.id} className="map-card template">
              <div className="map-icon">📋</div>
              <div className="map-info">
                <h4>{template.name}</h4>
                <p>{template.description}</p>
                <p className="map-meta">
                  Size: {template.size?.width || 'N/A'}x{template.size?.height || 'N/A'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="manager-section">
        <h3>Custom Maps ({maps.length})</h3>
        <p className="section-desc">
          Custom maps are created using the <code>/createmap</code> command in Discord
        </p>
        {maps.length === 0 ? (
          <p className="no-data">No custom maps yet. Use /createmap in Discord to create one!</p>
        ) : (
          <div className="map-list">
            {maps.map((map) => (
              <div key={map.id} className="map-card">
                <div className="map-icon">🗺️</div>
                <div className="map-info">
                  <h4>{map.name || map.id}</h4>
                  <p>{map.description || 'Custom map'}</p>
                  <p className="map-meta">
                    ID: {map.id}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="map-info-box">
        <h4>💡 Managing Maps</h4>
        <p>Maps can be created and edited using Discord slash commands:</p>
        <ul>
          <li><code>/createmap [name]</code> - Create a new custom map</li>
          <li><code>/usemap [mapId]</code> - Use a map for the next game</li>
          <li><code>/listmaps</code> - View all available maps</li>
          <li><code>/previewmap [mapId]</code> - Preview a map</li>
        </ul>
      </div>
    </div>
  );
}

export default MapManager;
