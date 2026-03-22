export interface Point {
  x: number;
  y: number;
}

export interface Entity {
  id: string;
  x: number;
  y: number;
  radius: number;
  type: 'ally' | 'enemy';
  color: string;
}

export interface Enemy extends Entity {
  type: 'enemy';
  visionAngle: number;
  visionRange: number;
  direction: number;
}

export interface Obstacle {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

export type Selection = {
  type: 'entity' | 'obstacle';
  id: string;
} | null;
