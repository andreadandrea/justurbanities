export type RenderableEntity = {
  id: string;
  label?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  image?: HTMLImageElement;
  color?: string;
  interactive?: boolean;
};
