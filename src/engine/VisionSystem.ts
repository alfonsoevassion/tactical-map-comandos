import type { Point, Obstacle } from '../types';

export interface Intersection {
  x: number;
  y: number;
  distance: number;
  angle: number;
}

export function getIntersection(
  rayStart: Point,
  rayEnd: Point,
  wallStart: Point,
  wallEnd: Point
): Intersection | null {
  const r_px = rayStart.x;
  const r_py = rayStart.y;
  const r_dx = rayEnd.x - rayStart.x;
  const r_dy = rayEnd.y - rayStart.y;

  const s_px = wallStart.x;
  const s_py = wallStart.y;
  const s_dx = wallEnd.x - wallStart.x;
  const s_dy = wallEnd.y - wallStart.y;

  const denominator = (s_dx * r_dy - s_dy * r_dx);
  if (Math.abs(denominator) < 0.000001) {
    return null;
  }

  const T2 = (r_dx * (s_py - r_py) + r_dy * (r_px - s_px)) / denominator;
  const T1 = (s_px + s_dx * T2 - r_px) / r_dx;

  if (Math.abs(r_dx) < 0.000001) {
    const T1_alt = (s_py + s_dy * T2 - r_py) / r_dy;
    if (T1_alt < 0) return null;
    if (T2 < 0 || T2 > 1) return null;
    return {
      x: r_px + r_dx * T1_alt,
      y: r_py + r_dy * T1_alt,
      distance: T1_alt,
      angle: Math.atan2(r_dy, r_dx),
    };
  }

  if (T1 < 0) return null;
  if (T2 < 0 || T2 > 1) return null;

  return {
    x: r_px + r_dx * T1,
    y: r_py + r_dy * T1,
    distance: T1,
    angle: Math.atan2(r_dy, r_dx),
  };
}

function rotatePoint(p: Point, origin: Point, angle: number): Point {
  const s = Math.sin(angle);
  const c = Math.cos(angle);
  let px = p.x - origin.x;
  let py = p.y - origin.y;
  let xnew = px * c - py * s;
  let ynew = px * s + py * c;
  return { x: xnew + origin.x, y: ynew + origin.y };
}

export function getObstacleCorners(obs: Obstacle): Point[] {
  const center = { x: obs.x + obs.width / 2, y: obs.y + obs.height / 2 };
  const corners = [
    { x: obs.x, y: obs.y },
    { x: obs.x + obs.width, y: obs.y },
    { x: obs.x + obs.width, y: obs.y + obs.height },
    { x: obs.x, y: obs.y + obs.height },
  ];
  return corners.map(p => rotatePoint(p, center, obs.rotation || 0));
}

export function areObstaclesColliding(obs1: Obstacle, obs2: Obstacle): boolean {
  const poly1 = getObstacleCorners(obs1);
  const poly2 = getObstacleCorners(obs2);

  const getAxes = (poly: Point[]) => {
    const axes: Point[] = [];
    for (let i = 0; i < poly.length; i++) {
      const p1 = poly[i];
      const p2 = poly[(i + 1) % poly.length];
      const edge = { x: p2.x - p1.x, y: p2.y - p1.y };
      const normal = { x: -edge.y, y: edge.x };
      const length = Math.sqrt(normal.x * normal.x + normal.y * normal.y);
      axes.push({ x: normal.x / length, y: normal.y / length });
    }
    return axes;
  };

  const project = (poly: Point[], axis: Point) => {
    let min = Infinity;
    let max = -Infinity;
    for (const p of poly) {
      const dot = p.x * axis.x + p.y * axis.y;
      min = Math.min(min, dot);
      max = Math.max(max, dot);
    }
    return { min, max };
  };

  const axes = [...getAxes(poly1), ...getAxes(poly2)];
  for (const axis of axes) {
    const proj1 = project(poly1, axis);
    const proj2 = project(poly2, axis);
    if (proj1.max < proj2.min || proj2.max < proj1.min) return false;
  }
  return true;
}

export function calculateVisibilityPolygon(
  origin: Point,
  obstacles: Obstacle[],
  maxRange: number
): Point[] {
  const rays: number[] = [];
  const boundaries = [
    { start: { x: 0, y: 0 }, end: { x: 2000, y: 0 } },
    { start: { x: 2000, y: 0 }, end: { x: 2000, y: 2000 } },
    { start: { x: 2000, y: 2000 }, end: { x: 0, y: 2000 } },
    { start: { x: 0, y: 2000 }, end: { x: 0, y: 0 } },
  ];

  obstacles.forEach((obs) => {
    const vertices = getObstacleCorners(obs);
    vertices.forEach((v) => {
      const angle = Math.atan2(v.y - origin.y, v.x - origin.x);
      rays.push(angle, angle - 0.0001, angle + 0.0001);
    });
  });

  [0, Math.PI / 2, Math.PI, -Math.PI / 2].forEach(a => rays.push(a));
  const uniqueRays = Array.from(new Set(rays));
  const intersections: Intersection[] = [];

  const walls: { start: Point; end: Point }[] = [];
  obstacles.forEach((obs) => {
    const v = getObstacleCorners(obs);
    walls.push(
      { start: v[0], end: v[1] },
      { start: v[1], end: v[2] },
      { start: v[2], end: v[3] },
      { start: v[3], end: v[0] }
    );
  });
  boundaries.forEach(b => walls.push(b));

  uniqueRays.forEach((angle) => {
    const rayEnd = {
      x: origin.x + Math.cos(angle) * maxRange * 2,
      y: origin.y + Math.sin(angle) * maxRange * 2,
    };
    let closest: Intersection | null = null;
    walls.forEach((wall) => {
      const intersect = getIntersection(origin, rayEnd, wall.start, wall.end);
      if (intersect) {
        if (!closest || intersect.distance < closest.distance) closest = intersect;
      }
    });
    if (closest) intersections.push(closest);
  });

  intersections.sort((a, b) => a.angle - b.angle);
  return intersections.map((i) => ({ x: i.x, y: i.y }));
}
