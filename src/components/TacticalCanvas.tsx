import React, { useRef, useEffect, useState } from 'react';
import type { Entity, Obstacle, Selection, Point, Enemy } from '../types';
import { calculateVisibilityPolygon } from '../engine/VisionSystem';

interface Props {
  entities: Entity[];
  obstacles: Obstacle[];
  onUpdateEntity: (id: string, x: number, y: number) => void;
  onUpdateObstacle: (id: string, x: number, y: number) => void;
  onUpdateDirection: (id: string, direction: number) => void;
  onUpdateObstacleRotation: (id: string, rotation: number) => void;
  onRemoveEntity: (id: string) => void;
  onRemoveObstacle: (id: string) => void;
}

const TacticalCanvas: React.FC<Props> = ({ 
  entities, 
  obstacles, 
  onUpdateEntity, 
  onUpdateObstacle, 
  onUpdateDirection, 
  onUpdateObstacleRotation,
  onRemoveEntity,
  onRemoveObstacle
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dragging, setDragging] = useState<Selection>(null);
  const [dragOffset, setDragOffset] = useState<Point>({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      try {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Pre-calculate vision polygons for each enemy
        const visionPolygons: Record<string, Point[]> = {};
        entities.forEach(entity => {
          if (entity.type === 'enemy') {
            const enemy = entity as Enemy;
            visionPolygons[enemy.id] = calculateVisibilityPolygon({ x: enemy.x, y: enemy.y }, obstacles, enemy.visionRange);
          }
        });

        // Draw Grid
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        for (let x = 0; x < canvas.width; x += 50) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, canvas.height);
          ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += 50) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(canvas.width, y);
          ctx.stroke();
        }

        // Draw Vision for Enemies
        entities.forEach(entity => {
          if (entity.type === 'enemy') {
            const enemy = entity as Enemy;
            const poly = visionPolygons[enemy.id];
            
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(enemy.x, enemy.y);
            ctx.arc(enemy.x, enemy.y, enemy.visionRange, enemy.direction - enemy.visionAngle / 2, enemy.direction + enemy.visionAngle / 2);
            ctx.closePath();
            ctx.clip();

            ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
            ctx.beginPath();
            if (poly && poly.length > 0) {
              ctx.moveTo(poly[0].x, poly[0].y);
              for (let i = 1; i < poly.length; i++) {
                ctx.lineTo(poly[i].x, poly[i].y);
              }
            }
            ctx.closePath();
            ctx.fill();
            ctx.restore();

            ctx.strokeStyle = 'rgba(255, 0, 0, 0.4)';
            ctx.beginPath();
            ctx.moveTo(enemy.x, enemy.y);
            ctx.lineTo(enemy.x + Math.cos(enemy.direction - enemy.visionAngle / 2) * enemy.visionRange, enemy.y + Math.sin(enemy.direction - enemy.visionAngle / 2) * enemy.visionRange);
            ctx.arc(enemy.x, enemy.y, enemy.visionRange, enemy.direction - enemy.visionAngle / 2, enemy.direction + enemy.visionAngle / 2);
            ctx.lineTo(enemy.x, enemy.y);
            ctx.stroke();
          }
        });

        // Draw Obstacles
        obstacles.forEach(obs => {
          ctx.save();
          const centerX = obs.x + obs.width / 2;
          const centerY = obs.y + obs.height / 2;
          ctx.translate(centerX, centerY);
          ctx.rotate(obs.rotation || 0);
          ctx.fillStyle = obs.color;
          ctx.fillRect(-obs.width / 2, -obs.height / 2, obs.width, obs.height);
          ctx.strokeStyle = '#fff';
          ctx.strokeRect(-obs.width / 2, -obs.height / 2, obs.width, obs.height);
          ctx.restore();
        });

        // Draw Entities
        entities.forEach(entity => {
        let isSeen = false;
        if (entity.type === 'ally') {
          entities.forEach(e => {
            if (e.type === 'enemy') {
              const enemy = e as Enemy;
              const poly = visionPolygons[enemy.id];
              if (!poly) return;

              const dist = Math.sqrt((entity.x - enemy.x) ** 2 + (entity.y - enemy.y) ** 2);
              // Detection happens if distance is within range + radius of ally
              if (dist <= enemy.visionRange + entity.radius) {
                const angle = Math.atan2(entity.y - enemy.y, entity.x - enemy.x);
                let diff = angle - enemy.direction;
                while (diff < -Math.PI) diff += Math.PI * 2;
                while (diff > Math.PI) diff -= Math.PI * 2;

                // Margin for angle detection based on radius
                const angleMargin = Math.atan2(entity.radius, dist);
                if (Math.abs(diff) <= (enemy.visionAngle / 2) + angleMargin) {
                  // Check multiple points around the circle for more precise detection
                  const checkPoints = [
                    { x: entity.x, y: entity.y },
                    { x: entity.x + entity.radius * Math.cos(angle - Math.PI/2), y: entity.y + entity.radius * Math.sin(angle - Math.PI/2) },
                    { x: entity.x + entity.radius * Math.cos(angle + Math.PI/2), y: entity.y + entity.radius * Math.sin(angle + Math.PI/2) },
                    { x: entity.x + entity.radius * Math.cos(angle), y: entity.y + entity.radius * Math.sin(angle) }
                  ];

                  for (const pt of checkPoints) {
                    let inside = false;
                    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
                      const xi = poly[i].x, yi = poly[i].y;
                      const xj = poly[j].x, yj = poly[j].y;
                      const intersect = ((yi > pt.y) !== (yj > pt.y))
                          && (pt.x < (xj - xi) * (pt.y - yi) / (yj - yi) + xi);
                      if (intersect) inside = !inside;
                    }
                    if (inside) {
                      isSeen = true;
                      break;
                    }
                  }
                }
              }
            }
          });
        }

        ctx.beginPath();
        ctx.arc(entity.x, entity.y, entity.radius, 0, Math.PI * 2);
        ctx.fillStyle = isSeen && entity.type === 'ally' ? 'yellow' : entity.color;
        ctx.fill();

          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.stroke();

          if (entity.type === 'enemy') {
            const enemy = entity as Enemy;
            ctx.beginPath();
            ctx.moveTo(enemy.x, enemy.y);
            ctx.lineTo(enemy.x + Math.cos(enemy.direction) * (enemy.radius + 10), enemy.y + Math.sin(enemy.direction) * (enemy.radius + 10));
            ctx.stroke();
          }
        });
      } catch (err) {
        console.error("Render error:", err);
      }

      requestAnimationFrame(render);
    };

    const animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [entities, obstacles]);

  const handleMouseDown = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check entities
    for (const entity of entities) {
      const dist = Math.sqrt((x - entity.x) ** 2 + (y - entity.y) ** 2);
      if (dist <= entity.radius) {
        setDragging({ type: 'entity', id: entity.id });
        setDragOffset({ x: x - entity.x, y: y - entity.y });
        return;
      }
    }

    // Check obstacles
    for (const obs of obstacles) {
      if (x >= obs.x && x <= obs.x + obs.width && y >= obs.y && y <= obs.y + obs.height) {
        setDragging({ type: 'obstacle', id: obs.id });
        setDragOffset({ x: x - obs.x, y: y - obs.y });
        return;
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (dragging.type === 'entity') {
      onUpdateEntity(dragging.id, x - dragOffset.x, y - dragOffset.y);
    } else {
      onUpdateObstacle(dragging.id, x - dragOffset.x, y - dragOffset.y);
    }
  };

  const handleMouseUp = () => {
    setDragging(null);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check entities
    for (const entity of entities) {
      const dist = Math.sqrt((x - entity.x) ** 2 + (y - entity.y) ** 2);
      if (dist <= entity.radius) {
        onRemoveEntity(entity.id);
        return;
      }
    }

    // Check obstacles
    for (const obs of obstacles) {
      if (x >= obs.x && x <= obs.x + obs.width && y >= obs.y && y <= obs.y + obs.height) {
        onRemoveObstacle(obs.id);
        return;
      }
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if mouse is over an enemy
    for (const entity of entities) {
      if (entity.type === 'enemy') {
        const dist = Math.sqrt((x - entity.x) ** 2 + (y - entity.y) ** 2);
        if (dist <= entity.radius) {
          e.preventDefault();
          const rotationSpeed = 0.1;
          const newDirection = (entity as Enemy).direction + (e.deltaY > 0 ? rotationSpeed : -rotationSpeed);
          onUpdateDirection(entity.id, newDirection);
          return;
        }
      }
    }

    // Check if mouse is over an obstacle
    for (const obs of obstacles) {
      // Simplified AABB check for rotation trigger, or we could use the center
      const centerX = obs.x + obs.width / 2;
      const centerY = obs.y + obs.height / 2;
      const distToCenter = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
      
      // If mouse is within the bounding radius of the obstacle
      if (distToCenter <= Math.max(obs.width, obs.height) / 1.5) {
        e.preventDefault();
        const rotationSpeed = 0.1;
        const newRotation = (obs.rotation || 0) + (e.deltaY > 0 ? rotationSpeed : -rotationSpeed);
        onUpdateObstacleRotation(obs.id, newRotation);
        return;
      }
    }
  };

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={600}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDoubleClick={handleDoubleClick}
      onWheel={handleWheel}
      style={{ backgroundColor: '#1a1a1a', cursor: dragging ? 'grabbing' : 'crosshair', borderRadius: '8px', boxShadow: '0 0 20px rgba(0,0,0,0.5)' }}
    />
  );
};

export default TacticalCanvas;
