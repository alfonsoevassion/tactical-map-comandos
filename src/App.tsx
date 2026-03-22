import { useState, useEffect } from 'react';
import './App.css';
import type { Entity, Obstacle, Enemy } from './types';
import TacticalCanvas from './components/TacticalCanvas';
import { areObstaclesColliding } from './engine/VisionSystem';

function App() {
  const [isAddingObstacle, setIsAddingObstacle] = useState(false);
  const [newObsSize, setNewObsSize] = useState({ width: 100, height: 100 });

  const [entities, setEntities] = useState<Entity[]>(() => {
    const saved = localStorage.getItem('tactical-entities');
    return saved ? JSON.parse(saved) : [
      { id: '1', x: 100, y: 100, radius: 15, type: 'ally', color: '#3498db' },
      { 
        id: '2', 
        x: 400, 
        y: 300, 
        radius: 15, 
        type: 'enemy', 
        color: '#e74c3c',
        visionAngle: Math.PI / 2, 
        visionRange: 300,
        direction: Math.PI 
      } as Enemy,
    ];
  });

  const [obstacles, setObstacles] = useState<Obstacle[]>(() => {
    const saved = localStorage.getItem('tactical-obstacles');
    const initial = [
      { id: 'o1', x: 250, y: 150, width: 100, height: 200, color: '#95a5a6', rotation: 0 },
      { id: 'o2', x: 500, y: 400, width: 50, height: 100, color: '#95a5a6', rotation: 0 },
      { id: 'o3', x: 50, y: 350, width: 150, height: 250, color: '#95a5a6', rotation: 0 },
      { id: 'o4', x: 600, y: 100, width: 80, height: 150, color: '#95a5a6', rotation: 0 },
    ];
    return saved ? JSON.parse(saved) : initial;
  });

  useEffect(() => {
    localStorage.setItem('tactical-entities', JSON.stringify(entities));
  }, [entities]);

  useEffect(() => {
    localStorage.setItem('tactical-obstacles', JSON.stringify(obstacles));
  }, [obstacles]);

  const updateEntity = (id: string, x: number, y: number) => {
    setEntities(prev => prev.map(e => e.id === id ? { ...e, x, y } : e));
  };

  const updateObstacle = (id: string, x: number, y: number) => {
    setObstacles(prev => {
      const current = prev.find(o => o.id === id);
      if (!current) return prev;
      const updated = { ...current, x, y };
      if (prev.some(o => o.id !== id && areObstaclesColliding(updated, o))) return prev;
      return prev.map(o => o.id === id ? updated : o);
    });
  };

  const rotateEnemy = (id: string) => {
    setEntities(prev => prev.map(e => {
      if (e.id === id && e.type === 'enemy') {
        const enemy = e as Enemy;
        return { ...enemy, direction: enemy.direction + 0.1 };
      }
      return e;
    }));
  };

  const updateDirection = (id: string, direction: number) => {
    setEntities(prev => prev.map(e => (e.id === id && e.type === 'enemy') ? { ...e, direction } : e));
  };

  const updateObstacleRotation = (id: string, rotation: number) => {
    setObstacles(prev => {
      const current = prev.find(o => o.id === id);
      if (!current) return prev;
      const updated = { ...current, rotation };
      if (prev.some(o => o.id !== id && areObstaclesColliding(updated, o))) return prev;
      return prev.map(o => o.id === id ? updated : o);
    });
  };

  const resetMap = () => {
    localStorage.removeItem('tactical-entities');
    localStorage.removeItem('tactical-obstacles');
    window.location.reload();
  };

  const confirmAddObstacle = () => {
    const newId = `o${Date.now()}`;
    const newObs: Obstacle = { 
      id: newId, 
      x: 100, 
      y: 100, 
      width: newObsSize.width, 
      height: newObsSize.height, 
      color: '#95a5a6', 
      rotation: 0 
    };

    let attempts = 0;
    while (obstacles.some(o => areObstaclesColliding(newObs, o)) && attempts < 25) {
      newObs.x += 30;
      newObs.y += 30;
      attempts++;
    }

    setObstacles(prev => [...prev, newObs]);
    setIsAddingObstacle(false);
  };

  const removeEntity = (id: string) => {
    setEntities(prev => prev.filter(e => e.id !== id));
  };

  const removeObstacle = (id: string) => {
    setObstacles(prev => prev.filter(o => o.id !== id));
  };

  const addAlly = () => {
    const newId = `a${Date.now()}`;
    setEntities(prev => [...prev, { id: newId, x: 50, y: 50, radius: 15, type: 'ally', color: '#3498db' }]);
  };

  const addEnemy = () => {
    const newId = `e${Date.now()}`;
    setEntities(prev => [...prev, { 
      id: newId, 
      x: 50, 
      y: 50, 
      radius: 15, 
      type: 'enemy', 
      color: '#e74c3c', 
      visionAngle: Math.PI / 2, 
      visionRange: 300, 
      direction: 0 
    } as Enemy]);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Mapa Táctico de Visión</h1>
        <p>Arrastra los círculos y bloques. Puedes rotar el campo de vision y los bloques con la rueda del raton sobre ellos. Doble click para eliminar elementos</p>
      </header>
      <div className="main-content">
        <div className="canvas-container" style={{ position: 'relative' }}>
          <TacticalCanvas 
            entities={entities} 
            obstacles={obstacles} 
            onUpdateEntity={updateEntity}
            onUpdateObstacle={updateObstacle}
            onUpdateDirection={updateDirection}
            onUpdateObstacleRotation={updateObstacleRotation}
            onRemoveEntity={removeEntity}
            onRemoveObstacle={removeObstacle}
          />
          
          {isAddingObstacle && (
            <div className="obstacle-modal">
              <h3>Añadir Bloque</h3>
              <div className="modal-input-group">
                <label>Ancho: </label>
                <input 
                  type="number" 
                  value={newObsSize.width} 
                  onChange={e => setNewObsSize(prev => ({ ...prev, width: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="modal-input-group">
                <label>Alto: </label>
                <input 
                  type="number" 
                  value={newObsSize.height} 
                  onChange={e => setNewObsSize(prev => ({ ...prev, height: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="modal-actions">
                <button className="btn-add" onClick={confirmAddObstacle}>Añadir</button>
                <button className="btn-reset" onClick={() => setIsAddingObstacle(false)}>Cancelar</button>
              </div>
            </div>
          )}

          <div className="toolbar">
            <button className="btn-add" onClick={addAlly}>+ Aliado</button>
            <button className="btn-add" onClick={addEnemy}>+ Enemigo</button>
            <button className="btn-add" onClick={() => setIsAddingObstacle(true)}>+ Bloque</button>
            <button className="btn-reset" onClick={resetMap}>Reiniciar Mapa</button>
          </div>
          <div className="legend">
            <span>🔵 Aliado</span>
            <span>🔴 Enemigo (con cono)</span>
            <span>⬜ Obstáculo</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
